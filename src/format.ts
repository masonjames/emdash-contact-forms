import type { FormDefinition, Submission } from "./types.js";
import { getFormFields } from "./types.js";

const CSV_ESCAPE_RE = /[,"\n]/;
const DOUBLE_QUOTE_RE = /"/g;
const CSV_FORMULA_TRIGGERS = new Set(["=", "+", "-", "@", "\t", "\r"]);

export function resolveNotificationRecipients(
	formRecipients: string[],
	fallbackRecipient: string | null | undefined,
): string[] {
	const normalizedFormRecipients = dedupeStrings(formRecipients);
	if (normalizedFormRecipients.length > 0) return normalizedFormRecipients;
	return dedupeStrings(fallbackRecipient ? [fallbackRecipient] : []);
}

export function formatSubmissionText(
	form: FormDefinition,
	data: Record<string, unknown>,
): string {
	const lines: string[] = [`New submission: ${form.name}`, ""];

	for (const field of getFormFields(form)) {
		const value = data[field.name];
		if (value === undefined || value === null || value === "") continue;
		lines.push(`${field.label}: ${formatDisplayValue(field.type, value)}`);
	}

	return lines.join("\n");
}

export function formatCsv(
	form: FormDefinition,
	submissions: Array<{ id: string; data: Submission }>,
): string {
	const currentFields = getFormFields(form);
	const currentFieldNames = currentFields.map((field) => field.name);
	const currentFieldNameSet = new Set(currentFieldNames);
	const orphanKeys = new Set<string>();

	for (const submission of submissions) {
		for (const key of Object.keys(submission.data.data)) {
			if (!currentFieldNameSet.has(key)) {
				orphanKeys.add(key);
			}
		}
	}

	const orphanColumns = [...orphanKeys].sort();
	const headers = [
		"ID",
		"Submitted At",
		"Status",
		...currentFields.map((field) => field.label),
		...orphanColumns,
	];

	const rows = submissions.map(({ id, data: submission }) => {
		const row = [id, submission.createdAt, submission.status];

		for (const field of currentFields) {
			row.push(valueToCsvString(submission.data[field.name], field.type));
		}

		for (const orphanKey of orphanColumns) {
			row.push(valueToCsvString(submission.data[orphanKey]));
		}

		return row;
	});

	return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function valueToCsvString(value: unknown, fieldType?: string): string {
	if (value === undefined || value === null) return "";
	if (fieldType === "checkbox") return value === true ? "true" : "false";
	if (typeof value === "boolean") return value ? "true" : "false";
	if (Array.isArray(value)) return value.join("; ");
	return String(value);
}

function formatDisplayValue(type: string, value: unknown): string {
	if (type === "checkbox") {
		return value === true ? "Yes" : "No";
	}
	if (Array.isArray(value)) {
		return value.join(", ");
	}
	return String(value);
}

function escapeCsv(value: string): string {
	if (value.length > 0 && CSV_FORMULA_TRIGGERS.has(value.charAt(0))) {
		value = `'${value}`;
	}
	if (CSV_ESCAPE_RE.test(value)) {
		return `"${value.replace(DOUBLE_QUOTE_RE, "\"\"")}"`;
	}
	return value;
}

function dedupeStrings(values: Array<string | null | undefined>): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const value of values) {
		if (typeof value !== "string") continue;
		const trimmed = value.trim();
		if (!trimmed || seen.has(trimmed)) continue;
		seen.add(trimmed);
		result.push(trimmed);
	}
	return result;
}
