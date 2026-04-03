export type FieldType = "text" | "email" | "textarea" | "select" | "checkbox";

export type FormStatus = "active" | "paused";
export type SubmissionStatus = "new" | "read" | "archived";

export interface FieldOption {
	label: string;
	value: string;
}

export interface FormField {
	id: string;
	type: FieldType;
	label: string;
	name: string;
	placeholder?: string;
	helpText?: string;
	required: boolean;
	options?: FieldOption[];
}

export interface FormPage {
	title?: string;
	fields: FormField[];
}

export interface FormSettings {
	confirmationMessage: string;
	redirectUrl?: string;
	notifyEmails: string[];
	submitLabel: string;
}

export interface FormDefinition {
	name: string;
	slug: string;
	pages: FormPage[];
	settings: FormSettings;
	status: FormStatus;
	submissionCount: number;
	lastSubmissionAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface SubmissionMeta {
	userAgent: string | null;
	referer: string | null;
	country: string | null;
}

export interface Submission {
	formId: string;
	data: Record<string, unknown>;
	status: SubmissionStatus;
	createdAt: string;
	meta: SubmissionMeta;
}

export interface SubmissionListItem {
	id: string;
	formId: string;
	formName: string;
	status: SubmissionStatus;
	createdAt: string;
	preview: string;
	meta: {
		country: string | null;
	};
}

export interface SubmissionDetail {
	id: string;
	formId: string;
	formName: string;
	data: Record<string, unknown>;
	status: SubmissionStatus;
	createdAt: string;
	meta: SubmissionMeta;
}

export interface FormOptionItem {
	label: string;
	value: string;
}

export interface RenderableForm {
	id: string;
	name: string;
	slug: string;
	status: FormStatus;
	pages: FormPage[];
	settings: Pick<FormSettings, "confirmationMessage" | "redirectUrl" | "submitLabel">;
}

export function getFormFields(form: Pick<FormDefinition, "pages">): FormField[] {
	return form.pages.flatMap((page) => page.fields);
}

export function getSingleFormPage(form: Pick<FormDefinition, "pages">): FormPage {
	return form.pages[0] ?? { fields: [] };
}

export function isSelectField(field: FormField): boolean {
	return field.type === "select";
}
