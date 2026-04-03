import type { RouteContext, StorageCollection } from "emdash";
import { ulid } from "ulidx";

import { formatSubmissionText, resolveNotificationRecipients } from "../format.js";
import { consumeRateLimit, isHoneypotTriggered } from "../security.js";
import type { SubmitInput } from "../schemas.js";
import type { FormDefinition, Submission } from "../types.js";
import { getFormFields } from "../types.js";
import { validateSubmission } from "../validation.js";

function forms(ctx: RouteContext): StorageCollection<FormDefinition> {
	return ctx.storage.forms as StorageCollection<FormDefinition>;
}

function submissions(ctx: RouteContext): StorageCollection<Submission> {
	return ctx.storage.submissions as StorageCollection<Submission>;
}

export async function submitHandler(ctx: RouteContext<SubmitInput>) {
	try {
		const form = await forms(ctx).get(ctx.input.formId);
		if (!form || form.status !== "active") {
			return genericFailure();
		}

		if (isHoneypotTriggered(ctx.input.data._hp)) {
			return successPayload(form);
		}

		const rateLimit = await consumeRateLimit(ctx, {
			formId: ctx.input.formId,
			ip: ctx.requestMeta.ip,
		});
		if (!rateLimit.allowed) {
			return genericFailure();
		}

		const validation = validateSubmission(getFormFields(form), ctx.input.data);
		if (!validation.valid) {
			return {
				success: false,
				errors: validation.errors,
			};
		}

		const createdAt = new Date().toISOString();
		const submissionId = ulid();
		const submission: Submission = {
			formId: ctx.input.formId,
			data: validation.data,
			status: "new",
			createdAt,
			meta: {
				userAgent: ctx.requestMeta.userAgent,
				referer: ctx.requestMeta.referer,
				country: ctx.requestMeta.geo?.country ?? null,
			},
		};

		await submissions(ctx).put(submissionId, submission);

		const submissionCount = await submissions(ctx).count({ formId: ctx.input.formId });
		await forms(ctx).put(ctx.input.formId, {
			...form,
			submissionCount,
			lastSubmissionAt: createdAt,
		});

		const fallbackRecipient = normalizeFallbackRecipient(
			await ctx.kv.get<string>("settings:defaultNotificationEmail"),
		);
		const recipients = resolveNotificationRecipients(form.settings.notifyEmails, fallbackRecipient);

		if (recipients.length > 0 && ctx.email) {
			const text = formatSubmissionText(form, validation.data);
			for (const recipient of recipients) {
				await ctx.email
					.send({
						to: recipient,
						subject: `New submission: ${form.name}`,
						text,
					})
					.catch((error: unknown) => {
						ctx.log.error("Failed to send contact form notification", {
							error: stringifyError(error),
							formId: ctx.input.formId,
							submissionId,
							to: recipient,
						});
					});
			}
		}

		return successPayload(form);
	} catch (error) {
		ctx.log.error("Contact form submit failed", {
			error: stringifyError(error),
			formId: ctx.input.formId,
		});
		return genericFailure();
	}
}

function successPayload(form: FormDefinition) {
	return {
		success: true,
		message: form.settings.confirmationMessage,
		redirect: form.settings.redirectUrl,
	};
}

function genericFailure() {
	return {
		success: false,
		message: "Please try again later.",
	};
}

function normalizeFallbackRecipient(value: string | null | undefined): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringifyError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
