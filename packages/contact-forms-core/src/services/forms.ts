import type { PluginContext, StorageCollection } from "emdash";
import { PluginRouteError } from "emdash";
import { ulid } from "ulidx";

import type { FormCreateInput, FormDeleteInput, FormUpdateInput } from "../domain/schemas.js";
import type { FormDefinition, FormPage } from "../domain/types.js";
import { normalizeFieldName, normalizeSlug, validateFormDefinition } from "../domain/validation.js";

function forms(ctx: PluginContext): StorageCollection<FormDefinition> {
	return ctx.storage.forms as StorageCollection<FormDefinition>;
}

function submissions(ctx: PluginContext): StorageCollection {
	return ctx.storage.submissions as StorageCollection;
}

export async function listForms(
	ctx: PluginContext,
	input: {
		id?: string;
		status?: FormDefinition["status"];
		cursor?: string;
		limit?: number;
	} = {},
) {
	if (input.id) {
		const form = await forms(ctx).get(input.id);
		return {
			items: form ? [{ id: input.id, data: form }] : [],
			hasMore: false,
			cursor: undefined,
		};
	}

	return forms(ctx).query({
		where: input.status ? { status: input.status } : undefined,
		orderBy: { createdAt: "desc" },
		limit: clampLimit(input.limit),
		cursor: input.cursor,
	});
}

export async function getForm(ctx: PluginContext, id: string) {
	const form = await forms(ctx).get(id);
	if (!form) {
		throw PluginRouteError.notFound("Form not found");
	}
	return { id, ...form };
}

export async function createForm(ctx: PluginContext, input: FormCreateInput) {
	const form = buildStoredForm(input);
	await assertUniqueSlug(ctx, form.slug);

	const validation = validateFormDefinition(form);
	if (!validation.valid) {
		throw PluginRouteError.badRequest("Invalid form definition", { errors: validation.errors });
	}

	const id = ulid();
	await forms(ctx).put(id, form);
	return { id, ...form };
}

export async function updateForm(ctx: PluginContext, input: FormUpdateInput) {
	const existing = await forms(ctx).get(input.id);
	if (!existing) {
		throw PluginRouteError.notFound("Form not found");
	}

	const merged = buildStoredForm(
		{
			name: input.name ?? existing.name,
			slug: input.slug ?? existing.slug,
			pages: input.pages ?? existing.pages,
			settings: {
				...existing.settings,
				...(input.settings ?? {}),
			},
		},
		{
			status: input.status ?? existing.status,
			submissionCount: existing.submissionCount,
			lastSubmissionAt: existing.lastSubmissionAt,
			createdAt: existing.createdAt,
		},
	);

	if (merged.slug !== existing.slug) {
		await assertUniqueSlug(ctx, merged.slug, input.id);
	}

	const validation = validateFormDefinition(merged);
	if (!validation.valid) {
		throw PluginRouteError.badRequest("Invalid form definition", { errors: validation.errors });
	}

	await forms(ctx).put(input.id, merged);
	return { id: input.id, ...merged };
}

export async function deleteForm(ctx: PluginContext, input: FormDeleteInput) {
	const existing = await forms(ctx).get(input.id);
	if (!existing) {
		throw PluginRouteError.notFound("Form not found");
	}

	await deleteFormSubmissions(ctx, input.id);
	await forms(ctx).delete(input.id);
	return { deleted: true };
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
			options: field.type === "select" ? dedupeOptions(field.options ?? []) : undefined,
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

async function assertUniqueSlug(ctx: PluginContext, slug: string, ignoreId?: string) {
	const existing = await forms(ctx).query({ where: { slug }, limit: 10 });
	const conflict = existing.items.find((item) => item.id !== ignoreId);
	if (conflict) {
		throw PluginRouteError.conflict(`A form with slug "${slug}" already exists`);
	}
}

async function deleteFormSubmissions(ctx: PluginContext, formId: string) {
	for (;;) {
		const batch = await submissions(ctx).query({ where: { formId }, orderBy: { createdAt: "desc" }, limit: 100 });
		if (batch.items.length === 0) break;
		await submissions(ctx).deleteMany(batch.items.map((item) => item.id));
	}
}

function dedupeOptions(options: Array<{ label: string; value: string }>) {
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

function dedupeStrings(values: string[]) {
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

function clampLimit(value?: number): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return 100;
	return Math.max(1, Math.min(100, Math.floor(value)));
}
