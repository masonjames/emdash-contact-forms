let initialized = false;

interface ValidationError {
	field: string;
	message: string;
}

interface SubmitResult {
	success?: boolean;
	message?: string;
	redirect?: string;
	errors?: ValidationError[];
}

export function initContactForms() {
	if (initialized) return;
	initialized = true;

	document.addEventListener("submit", handleSubmit);
	document.addEventListener("input", handleInput);
	document.addEventListener("astro:page-load", bindAfterNavigation);
}

function bindAfterNavigation() {
	// listeners are delegated at document level; no-op hook keeps behavior explicit
}

async function handleSubmit(event: Event) {
	const form = (event.target as HTMLElement | null)?.closest<HTMLFormElement>("[data-mjcf-form]");
	if (!form) return;

	event.preventDefault();
	clearErrors(form);
	showStatus(form, "", "");

	const submitButton = form.querySelector<HTMLButtonElement>("[data-mjcf-submit]");
	const submitLabel = form.dataset.submitLabel || submitButton?.textContent || "Submit";
	const loadingLabel = submitButton?.dataset.loadingLabel || "Sending...";

	if (submitButton) {
		submitButton.disabled = true;
		submitButton.textContent = loadingLabel;
	}

	try {
		const formData = new FormData(form);
		const body = serializeFormData(formData);
		const response = await fetch(form.action, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-EmDash-Request": "1",
			},
			body: JSON.stringify(body),
		});
		const json = await response.json();
		const result = unwrapPayload(json);

		if (result.success) {
			if (result.redirect) {
				window.location.href = result.redirect;
				return;
			}

			form.reset();
			clearErrors(form);
			showStatus(form, result.message || "Thank you for your submission.", "success");
			return;
		}

		if (result.errors?.length) {
			showErrors(form, result.errors);
			showStatus(form, result.message || "Please review the highlighted fields.", "error");
			return;
		}

		showStatus(form, result.message || "Please try again later.", "error");
	} catch {
		showStatus(form, "Network error. Please try again.", "error");
	} finally {
		if (submitButton) {
			submitButton.disabled = false;
			submitButton.textContent = submitLabel;
		}
	}
}

function handleInput(event: Event) {
	const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
	if (!target?.name) return;
	const form = target.closest<HTMLFormElement>("[data-mjcf-form]");
	if (!form) return;

	const error = form.querySelector<HTMLElement>(`[data-mjcf-error-for="${CSS.escape(target.name)}"]`);
	if (error) {
		error.textContent = "";
	}
	target.removeAttribute("aria-invalid");
	showStatus(form, "", "");
}

function serializeFormData(formData: FormData): { formId: string; data: Record<string, unknown> } {
	const data: Record<string, unknown> = {};
	let formId = "";

	for (const [key, value] of formData.entries()) {
		if (key === "formId" && typeof value === "string") {
			formId = value;
			continue;
		}

		if (typeof value !== "string") continue;
		data[key] = value;
	}

	return { formId, data };
}

function unwrapPayload(value: unknown): SubmitResult {
	if (value && typeof value === "object" && "data" in value) {
		const nested = value.data;
		if (nested && typeof nested === "object") {
			return nested as SubmitResult;
		}
	}

	return (value ?? {}) as SubmitResult;
}

function showErrors(form: HTMLFormElement, errors: ValidationError[]) {
	for (const error of errors) {
		const field = form.elements.namedItem(error.field);
		if (field instanceof HTMLElement) {
			field.setAttribute("aria-invalid", "true");
		}
		const errorNode = form.querySelector<HTMLElement>(
			`[data-mjcf-error-for="${CSS.escape(error.field)}"]`,
		);
		if (errorNode) {
			errorNode.textContent = error.message;
		}
	}
}

function clearErrors(form: HTMLFormElement) {
	for (const node of form.querySelectorAll<HTMLElement>("[data-mjcf-error-for]")) {
		node.textContent = "";
	}

	for (const field of form.querySelectorAll<HTMLElement>("[aria-invalid='true']")) {
		field.removeAttribute("aria-invalid");
	}
}

function showStatus(form: HTMLFormElement, message: string, tone: "" | "success" | "error") {
	const status = form.querySelector<HTMLElement>("[data-mjcf-status]");
	if (!status) return;
	status.textContent = message;
	status.dataset.state = tone;
}
