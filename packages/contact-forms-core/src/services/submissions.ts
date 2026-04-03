import type { PluginContext, StorageCollection } from "emdash";
import { PluginRouteError } from "emdash";

import { formatCsv } from "../domain/format.js";
import type {
	ExportInput,
	SubmissionDeleteInput,
	SubmissionGetInput,
	SubmissionsListInput,
	SubmissionUpdateInput,
} from "../domain/schemas.js";
import type {
	FormDefinition,
	Submission,
	SubmissionDetail,
	SubmissionListItem,
} from "../domain/types.js";

function forms(ctx: PluginContext): StorageCollection<FormDefinition> {
	return ctx.storage.forms as StorageCollection<FormDefinition>;
}

function submissions(ctx: PluginContext): StorageCollection<Submission> {
	return ctx.storage.submissions as StorageCollection<Submission>;
}

export async function listSubmissions(ctx: PluginContext, input: Partial<SubmissionsListInput> = {}) {
	const result = await submissions(ctx).query({
		where: {
			...(input.formId ? { formId: input.formId } : {}),
			...(input.status ? { status: input.status } : {}),
		},
		orderBy: { createdAt: "desc" },
		limit: input.limit ?? 50,
		cursor: input.cursor,
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
			meta: { country: item.data.meta.country },
		})),
		hasMore: result.hasMore,
		cursor: result.cursor,
	};
}

export async function getSubmission(ctx: PluginContext, id: string): Promise<SubmissionDetail> {
	const submission = await submissions(ctx).get(id);
	if (!submission) {
		throw PluginRouteError.notFound("Submission not found");
	}

	const form = await forms(ctx).get(submission.formId);
	return {
		id,
		formId: submission.formId,
		formName: form?.name ?? "Unknown form",
		data: submission.data,
		status: submission.status,
		createdAt: submission.createdAt,
		meta: submission.meta,
	};
}

export async function updateSubmissionStatus(ctx: PluginContext, input: SubmissionUpdateInput) {
	const existing = await submissions(ctx).get(input.id);
	if (!existing) {
		throw PluginRouteError.notFound("Submission not found");
	}

	const updated: Submission = { ...existing, status: input.status };
	await submissions(ctx).put(input.id, updated);
	return { id: input.id, ...updated };
}

export async function deleteSubmission(ctx: PluginContext, input: SubmissionDeleteInput) {
	const existing = await submissions(ctx).get(input.id);
	if (!existing) {
		throw PluginRouteError.notFound("Submission not found");
	}

	await submissions(ctx).delete(input.id);
	await recomputeFormStats(ctx, existing.formId);
	return { deleted: true };
}

export async function exportSubmissions(ctx: PluginContext, input: ExportInput) {
	const form = await forms(ctx).get(input.formId);
	if (!form) {
		throw PluginRouteError.notFound("Form not found");
	}

	const items: Array<{ id: string; data: Submission }> = [];
	let cursor: string | undefined;
	do {
		const batch = await submissions(ctx).query({
			where: {
				formId: input.formId,
				...(input.status ? { status: input.status } : {}),
				...(input.from || input.to
					? {
						createdAt: {
							...(input.from ? { gte: input.from } : {}),
							...(input.to ? { lte: input.to } : {}),
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

export async function recomputeFormStats(ctx: PluginContext, formId: string) {
	const form = await forms(ctx).get(formId);
	if (!form) return;

	const latest = await submissions(ctx).query({ where: { formId }, orderBy: { createdAt: "desc" }, limit: 1 });
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
