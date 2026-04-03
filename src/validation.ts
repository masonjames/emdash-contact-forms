import type { FormDefinition, FormField, FormPage } from "./types.js";

export interface ValidationError {
	field: string;
	message: string;
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	data: Record<string, unknown>;
}

export interface FormValidationResult {
	valid: boolean;
	errors: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HTTP_SCHEME_RE = /^https?:\/\//i;
const NON_ALNUM_PATTERN = /[^a-z0-9]+/g;
const LEADING_TRAILING_SEP = /^-|-$/g;
const LEADING_UNDERSCORE_TRIM = /^_|_$/g;
const LEADING_DIGIT = /^(\d)/;

export function normalizeSlug(input: string): string {
	return input.toLowerCase().trim().replace(NON_ALNUM_PATTERN, "-").replace(LEADING_TRAILING_SEP, "");
}

export function normalizeFieldName(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(NON_ALNUM_PATTERN, "_")
		.replace(LEADING_UNDERSCORE_TRIM, "")
		.replace(LEADING_DIGIT, "_$1");
}

export function validateFormDefinition(form: {
	pages?: FormPage[];
	settings?: Partial<FormDefinition["settings"]>;
}): FormValidationResult {
	const errors: string[] = [];
	const pages = form.pages;

	if (pages) {
		if (pages.length !== 1) {
			errors.push("Release A forms support exactly one page");
		}

		const fieldNames = new Set<string>();
		for (const page of pages) {
			if (!page.fields.length) {
				errors.push("Each form must contain at least one field");
				continue;
			}

			for (const field of page.fields) {
				if (fieldNames.has(field.name)) {
					errors.push(`Duplicate field name "${field.name}"`);
				}
				fieldNames.add(field.name);

				if (field.type === "select") {
					if (!field.options || field.options.length === 0) {
						errors.push(`Select field "${field.label}" must define at least one option`);
					}
					const optionValues = new Set<string>();
					for (const option of field.options ?? []) {
						if (optionValues.has(option.value)) {
							errors.push(`Select field "${field.label}" contains duplicate option values`);
						}
						optionValues.add(option.value);
					}
				} else if (field.options && field.options.length > 0) {
					errors.push(`Only select fields can define options (${field.label})`);
				}
			}
		}
	}

	const redirectUrl = form.settings?.redirectUrl;
	if (redirectUrl && !HTTP_SCHEME_RE.test(redirectUrl)) {
		errors.push("Redirect URL must use http or https");
	}

	return { valid: errors.length === 0, errors };
}

export function validateSubmission(
	fields: FormField[],
	data: Record<string, unknown>,
): ValidationResult {
	const errors: ValidationError[] = [];
	const validated: Record<string, unknown> = {};

	for (const field of fields) {
		const raw = data[field.name];
		const empty =
			field.type === "checkbox"
				? !coerceCheckboxValue(raw)
				: raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "");

		if (field.required && empty) {
			errors.push({
				field: field.name,
				message: `${field.label} is required`,
			});
			continue;
		}

		if (field.type === "checkbox") {
			const value = coerceCheckboxValue(raw);
			if (value || field.required || raw !== undefined) {
				validated[field.name] = value;
			}
			continue;
		}

		if (empty) continue;

		if (typeof raw !== "string") {
			errors.push({
				field: field.name,
				message: `${field.label} has an invalid value`,
			});
			continue;
		}

		const value = raw.trim();

		if (field.type === "email" && !EMAIL_RE.test(value)) {
			errors.push({
				field: field.name,
				message: `${field.label} must be a valid email address`,
			});
			continue;
		}

		if (field.type === "select") {
			const validOptions = new Set((field.options ?? []).map((option) => option.value));
			if (!validOptions.has(value)) {
				errors.push({
					field: field.name,
					message: `${field.label} has an invalid selection`,
				});
				continue;
			}
		}

		validated[field.name] = value;
	}

	return {
		valid: errors.length === 0,
		errors,
		data: validated,
	};
}

export function coerceCheckboxValue(value: unknown): boolean {
	return value === true || value === "true" || value === "1" || value === "on";
}
