import type { RouteContext, StorageCollection } from "emdash";
import { PluginRouteError } from "emdash";
import { ulid } from "ulidx";

import type { FormCreateInput, FormDeleteInput, FormUpdateInput } from "../schemas.js";
import type {
	FormDefinition,
	FormOptionItem,
	FormPage,
	RenderableForm,
} from "../types.js";
import { normalizeFieldName, normalizeSlug, validateFormDefinition } from "../validation.js";

type FormsListMode = "full" | "options" | "render";

function forms(ctx: RouteContext): StorageCollection<FormDefinition> {
	return ctx.storage.forms as StorageCollection<FormDefinition>;
}

function submissions(ctx: RouteContext): StorageCollection {
	return ctx.storage.submissions as StorageCollection;
}

export async function formsListHandler(ctx: RouteContext) {
	const input = readFormsListInput(ctx);

	if (input.id) {
		const form = await forms(ctx).get(input.id);
		if (!form) {
			return { items: [], hasMore: false };
		}
		return {
			items: [formatFormResult(input.mode, input.id, form)],
			hasMore: false,
		};
	}

	const result = await forms(ctx).query({
		where: input.status ? { status: input.status } : undefined,
		orderBy: { createdAt: "desc" },
		limit: input.limit,
		cursor: input.cursor,
	});

	return {
		items: result.items.map((item) => formatFormResult(input.mode, item.id, item.data)),
		hasMore: result.hasMore,
		cursor: result.cursor,
	};
}

export async function formsCreateHandler(ctx: RouteContext<FormCreateInput>) {
	const form = buildStoredForm(ctx.input);
	await assertUniqueSlug(ctx, form.slug);

	const validation = validateFormDefinition(form);
	if (!validation.valid) {
		throw PluginRouteError.badRequest("Invalid form definition", { errors: validation.errors });
	}

	const id = ulid();
	await forms(ctx).put(id, form);
	return { id, ...form };
}

export async function formsUpdateHandler(ctx: RouteContext<FormUpdateInput>) {
	const existing = await forms(ctx).get(ctx.input.id);
	if (!existing) {
		throw PluginRouteError.notFound("Form not found");
	}

	const merged = buildStoredForm(
		{
			name: ctx.input.name ?? existing.name,
			slug: ctx.input.slug ?? existing.slug,
			pages: ctx.input.pages ?? existing.pages,
			settings: {
				...existing.settings,
				...(ctx.input.settings ?? {}),
			},
		},
		{
			status: ctx.input.status ?? existing.status,
			submissionCount: existing.submissionCount,
			lastSubmissionAt: existing.lastSubmissionAt,
			createdAt: existing.createdAt,
		},
	);

	if (merged.slug !== existing.slug) {
		await assertUniqueSlug(ctx, merged.slug, ctx.input.id);
	}

	const validation = validateFormDefinition(merged);
	if (!validation.valid) {
		throw PluginRouteError.badRequest("Invalid form definition", { errors: validation.errors });
	}

	await forms(ctx).put(ctx.input.id, merged);
	return { id: ctx.input.id, ...merged };
}

export async function formsDeleteHandler(ctx: RouteContext<FormDeleteInput>) {
	const existing = await forms(ctx).get(ctx.input.id);
	if (!existing) {
		throw PluginRouteError.notFound("Form not found");
	}

	await deleteFormSubmissions(ctx, ctx.input.id);
	await forms(ctx).delete(ctx.input.id);

	return { deleted: true };
}

function readFormsListInput(ctx: RouteContext): {
	id?: string;
	mode: FormsListMode;
	status?: FormDefinition["status"];
	cursor?: string;
	limit: number;
} {
	const url = new URL(ctx.request.url);
	const body = isRecord(ctx.input) ? ctx.input : {};
	const id = getString(body.id) ?? url.searchParams.get("id") ?? undefined;
	const mode = normalizeMode(getString(body.mode) ?? url.searchParams.get("mode"));
	const status = normalizeStatus(getString(body.status) ?? url.searchParams.get("status"));
	const cursor = getString(body.cursor) ?? url.searchParams.get("cursor") ?? undefined;
	const limit = clampLimit(getNumber(body.limit) ?? numberFromString(url.searchParams.get("limit")));

	return { id, mode, status, cursor, limit };
}

function buildStoredForm(
	input: Pick<FormCreateInput, "name" | "slug" | "pages" | "settings">,
	existing?: {
		status?: FormDefinition["status"];
		submissionCount?: number;
		lastSubmissionAt?: string | null;
		createdAt?: string;
	},
): FormDefinition {
	const now = new Date().toISOString();
	const sanitizedPages = sanitizePages(input.pages);
	const sanitizedSettings = sanitizeSettings(input.settings);

	return {
		name: input.name.trim(),
		slug: normalizeSlug(input.slug),
		pages: sanitizedPages,
		settings: sanitizedSettings,
		status: existing?.status ?? "active",
		submissionCount: existing?.submissionCount ?? 0,
		lastSubmissionAt: existing?.lastSubmissionAt ?? null,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
	};
}

function sanitizePages(pages: FormPage[]): FormPage[] {
	return pages.map((page) => ({
		title: page.title?.trim() || undefined,
		fields: page.fields.map((field) => ({
			id: field.id.trim(),
			type: field.type,
			label: field.label.trim(),
			name: normalizeFieldName(field.name),
			placeholder: field.placeholder?.trim() || undefined,
			helpText: field.helpText?.trim() || undefined,
			required: field.required,
			options:
				field.type === "select"
					? dedupeOptions(field.options ?? [])
					: undefined,
		})),
	}));
}

function sanitizeSettings(settings: FormCreateInput["settings"]): FormDefinition["settings"] {
	return {
		confirmationMessage: settings.confirmationMessage.trim(),
		redirectUrl: settings.redirectUrl?.trim() || undefined,
		notifyEmails: dedupeStrings(settings.notifyEmails),
		submitLabel: settings.submitLabel.trim(),
	};
}

function formatFormResult(
	mode: FormsListMode,
	id: string,
	form: FormDefinition,
): FormDefinition | FormOptionItem | RenderableForm {
	if (mode === "options") {
		return {
			label: form.status === "paused" ? `${form.name} (paused)` : form.name,
			value: id,
		};
	}

	if (mode === "render") {
		return {
			id,
			name: form.name,
			slug: form.slug,
			status: form.status,
			pages: form.pages,
			settings: {
				confirmationMessage: form.settings.confirmationMessage,
				redirectUrl: form.settings.redirectUrl,
				submitLabel: form.settings.submitLabel,
			},
		};
	}

	return { ...form, id };
}

async function assertUniqueSlug(ctx: RouteContext, slug: string, ignoreId?: string) {
	const existing = await forms(ctx).query({
		where: { slug },
		limit: 10,
	});

	const conflict = existing.items.find((item) => item.id !== ignoreId);
	if (conflict) {
		throw PluginRouteError.conflict(`A form with slug "${slug}" already exists`);
	}
}

async function deleteFormSubmissions(ctx: RouteContext, formId: string) {
	for (;;) {
		const batch = await submissions(ctx).query({
			where: { formId },
			orderBy: { createdAt: "desc" },
			limit: 100,
		});

		if (batch.items.length === 0) break;
		await submissions(ctx).deleteMany(batch.items.map((item) => item.id));
	}
}

function dedupeOptions(options: Array<{ label: string; value: string }>): Array<{ label: string; value: string }> {
	const seen = new Set<string>();
	const result: Array<{ label: string; value: string }> = [];

	for (const option of options) {
		const label = option.label.trim();
		const value = option.value.trim();
		if (!label || !value || seen.has(value)) continue;
		seen.add(value);
		result.push({ label, value });
	}

	return result;
}

function dedupeStrings(values: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const value of values) {
		const trimmed = value.trim();
		if (!trimmed || seen.has(trimmed)) continue;
		seen.add(trimmed);
		result.push(trimmed);
	}

	return result;
}

function normalizeMode(value?: string | null): FormsListMode {
	return value === "options" || value === "render" ? value : "full";
}

function normalizeStatus(value?: string | null): FormDefinition["status"] | undefined {
	return value === "active" || value === "paused" ? value : undefined;
}

function clampLimit(value?: number): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return 100;
	return Math.max(1, Math.min(100, Math.floor(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function numberFromString(value: string | null): number | undefined {
	if (!value) return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}
