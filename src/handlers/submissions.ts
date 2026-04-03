import type { PluginContext, RouteContext, StorageCollection } from "emdash";
import { PluginRouteError } from "emdash";

import { formatCsv } from "../format.js";
import type {
	ExportInput,
	SubmissionDeleteInput,
	SubmissionGetInput,
	SubmissionsListInput,
	SubmissionUpdateInput,
} from "../schemas.js";
import type {
	FormDefinition,
	Submission,
	SubmissionDetail,
	SubmissionListItem,
} from "../types.js";
import { getFormFields } from "../types.js";

type FormsAndSubmissionsContext = RouteContext | PluginContext;

function forms(ctx: FormsAndSubmissionsContext): StorageCollection<FormDefinition> {
	return ctx.storage.forms as StorageCollection<FormDefinition>;
}

function submissions(ctx: FormsAndSubmissionsContext): StorageCollection<Submission> {
	return ctx.storage.submissions as StorageCollection<Submission>;
}

export async function submissionsListHandler(ctx: RouteContext<SubmissionsListInput>) {
	const result = await submissions(ctx).query({
		where: {
			...(ctx.input.formId ? { formId: ctx.input.formId } : {}),
			...(ctx.input.status ? { status: ctx.input.status } : {}),
		},
		orderBy: { createdAt: "desc" },
		limit: ctx.input.limit,
		cursor: ctx.input.cursor,
	});

	const formIds = [...new Set(result.items.map((item) => item.data.formId))];
	const formMap = await forms(ctx).getMany(formIds);

	return {
		items: result.items.map<SubmissionListItem>((item) => ({
			id: item.id,
			formId: item.data.formId,
			formName: formMap.get(item.data.formId)?.name ?? "Unknown form",
			status: item.data.status,
			createdAt: item.data.createdAt,
			preview: buildPreview(item.data.data),
			meta: {
				country: item.data.meta.country,
			},
		})),
		hasMore: result.hasMore,
		cursor: result.cursor,
	};
}

export async function submissionGetHandler(ctx: RouteContext<SubmissionGetInput>) {
	const submission = await submissions(ctx).get(ctx.input.id);
	if (!submission) {
		throw PluginRouteError.notFound("Submission not found");
	}

	const form = await forms(ctx).get(submission.formId);

	const detail: SubmissionDetail = {
		id: ctx.input.id,
		formId: submission.formId,
		formName: form?.name ?? "Unknown form",
		data: submission.data,
		status: submission.status,
		createdAt: submission.createdAt,
		meta: submission.meta,
	};

	return detail;
}

export async function submissionUpdateHandler(ctx: RouteContext<SubmissionUpdateInput>) {
	const existing = await submissions(ctx).get(ctx.input.id);
	if (!existing) {
		throw PluginRouteError.notFound("Submission not found");
	}

	const updated: Submission = {
		...existing,
		status: ctx.input.status,
	};

	await submissions(ctx).put(ctx.input.id, updated);
	return { id: ctx.input.id, ...updated };
}

export async function submissionDeleteHandler(ctx: RouteContext<SubmissionDeleteInput>) {
	const existing = await submissions(ctx).get(ctx.input.id);
	if (!existing) {
		throw PluginRouteError.notFound("Submission not found");
	}

	await submissions(ctx).delete(ctx.input.id);
	await recomputeFormStats(existing.formId, ctx);
	return { deleted: true };
}

export async function exportHandler(ctx: RouteContext<ExportInput>) {
	const form = await forms(ctx).get(ctx.input.formId);
	if (!form) {
		throw PluginRouteError.notFound("Form not found");
	}

	const items: Array<{ id: string; data: Submission }> = [];
	let cursor: string | undefined;

	do {
		const batch = await submissions(ctx).query({
			where: {
				formId: ctx.input.formId,
				...(ctx.input.status ? { status: ctx.input.status } : {}),
				...(ctx.input.from || ctx.input.to
					? {
							createdAt: {
								...(ctx.input.from ? { gte: ctx.input.from } : {}),
								...(ctx.input.to ? { lte: ctx.input.to } : {}),
							},
						}
					: {}),
			},
			orderBy: { createdAt: "desc" },
			limit: 100,
			cursor,
		});

		items.push(...batch.items);
		cursor = batch.cursor;
	} while (cursor);

	return {
		data: formatCsv(form, items),
		filename: `${form.slug}-submissions-${new Date().toISOString().slice(0, 10)}.csv`,
		contentType: "text/csv",
		count: items.length,
	};
}

export async function recomputeFormStats(formId: string, ctx: FormsAndSubmissionsContext) {
	const form = await forms(ctx).get(formId);
	if (!form) return;

	const latest = await submissions(ctx).query({
		where: { formId },
		orderBy: { createdAt: "desc" },
		limit: 1,
	});

	await forms(ctx).put(formId, {
		...form,
		submissionCount: await submissions(ctx).count({ formId }),
		lastSubmissionAt: latest.items[0]?.data.createdAt ?? null,
	});
}

function buildPreview(data: Record<string, unknown>): string {
	const entries = Object.values(data)
		.filter((value) => value !== undefined && value !== null && value !== "" && value !== false)
		.slice(0, 2)
		.map((value) => String(value));

	return entries.join(" · ") || "(empty)";
}
