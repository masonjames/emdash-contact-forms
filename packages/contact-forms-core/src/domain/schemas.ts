import { z } from "astro/zod";

const HTTP_SCHEME_RE = /^https?:\/\//i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const httpUrl = z
	.string()
	.url()
	.refine((url) => HTTP_SCHEME_RE.test(url), "URL must use http or https");

const emailString = z.string().refine((value) => EMAIL_RE.test(value), "Invalid email address");

export const fieldTypeSchema = z.enum(["text", "email", "textarea", "select", "checkbox"]);

const fieldOptionSchema = z.object({
	label: z.string().trim().min(1),
	value: z.string().trim().min(1),
});

export const formFieldSchema = z.object({
	id: z.string().trim().min(1),
	type: fieldTypeSchema,
	label: z.string().trim().min(1),
	name: z
		.string()
		.trim()
		.min(1)
		.regex(/^[a-z][a-z0-9_]*$/, "Field name must start with a letter and use only lowercase letters, numbers, and underscores"),
	placeholder: z.string().optional(),
	helpText: z.string().optional(),
	required: z.boolean(),
	options: z.array(fieldOptionSchema).optional(),
});

export const formPageSchema = z.object({
	title: z.string().optional(),
	fields: z.array(formFieldSchema).min(1, "Each form must include at least one field"),
});

export const formSettingsSchema = z.object({
	confirmationMessage: z.string().trim().min(1).default("Thank you for your submission."),
	redirectUrl: z.union([httpUrl, z.literal("")]).optional(),
	notifyEmails: z.array(emailString).default([]),
	submitLabel: z.string().trim().min(1).default("Submit"),
});

const formPagesSchema = z.array(formPageSchema).length(1, "Release A forms support exactly one page");

export const formCreateSchema = z.object({
	name: z.string().trim().min(1).max(200),
	slug: z
		.string()
		.trim()
		.min(1)
		.max(100)
		.regex(/^[a-z][a-z0-9-]*$/, "Slug must be lowercase alphanumeric with hyphens"),
	pages: formPagesSchema,
	settings: formSettingsSchema,
});

export const formUpdateSchema = z.object({
	id: z.string().trim().min(1),
	name: z.string().trim().min(1).max(200).optional(),
	slug: z
		.string()
		.trim()
		.min(1)
		.max(100)
		.regex(/^[a-z][a-z0-9-]*$/, "Slug must be lowercase alphanumeric with hyphens")
		.optional(),
	pages: formPagesSchema.optional(),
	settings: formSettingsSchema.partial().optional(),
	status: z.enum(["active", "paused"]).optional(),
});

export const formDeleteSchema = z.object({
	id: z.string().trim().min(1),
});

export const submitSchema = z.object({
	formId: z.string().trim().min(1),
	data: z.record(z.string(), z.unknown()),
});

export const submissionsListSchema = z.object({
	formId: z.string().trim().min(1).optional(),
	status: z.enum(["new", "read", "archived"]).optional(),
	cursor: z.string().optional(),
	limit: z.number().int().min(1).max(100).default(50),
});

export const submissionGetSchema = z.object({
	id: z.string().trim().min(1),
});

export const submissionUpdateSchema = z.object({
	id: z.string().trim().min(1),
	status: z.enum(["new", "read", "archived"]),
});

export const submissionDeleteSchema = z.object({
	id: z.string().trim().min(1),
});

export const exportSchema = z.object({
	formId: z.string().trim().min(1),
	status: z.enum(["new", "read", "archived"]).optional(),
	from: z.string().datetime().optional(),
	to: z.string().datetime().optional(),
});

export type FormCreateInput = z.infer<typeof formCreateSchema>;
export type FormUpdateInput = z.infer<typeof formUpdateSchema>;
export type FormDeleteInput = z.infer<typeof formDeleteSchema>;
export type SubmitInput = z.infer<typeof submitSchema>;
export type SubmissionsListInput = z.infer<typeof submissionsListSchema>;
export type SubmissionGetInput = z.infer<typeof submissionGetSchema>;
export type SubmissionUpdateInput = z.infer<typeof submissionUpdateSchema>;
export type SubmissionDeleteInput = z.infer<typeof submissionDeleteSchema>;
export type ExportInput = z.infer<typeof exportSchema>;
