import type { PluginContext, RouteContext, StorageCollection } from "emdash";
import { ulid } from "ulidx";

import { formatSubmissionText, resolveNotificationRecipients } from "../domain/format.js";
import { consumeRateLimit, isHoneypotTriggered } from "../domain/security.js";
import type { SubmitInput } from "../domain/schemas.js";
import type { FormDefinition, Submission } from "../domain/types.js";
import { getFormFields } from "../domain/types.js";
import { validateSubmission } from "../domain/validation.js";

type RequestMetaLike = RouteContext["requestMeta"];

function forms(ctx: PluginContext): StorageCollection<FormDefinition> {
	return ctx.storage.forms as StorageCollection<FormDefinition>;
}

function submissions(ctx: PluginContext): StorageCollection<Submission> {
	return ctx.storage.submissions as StorageCollection<Submission>;
}

export async function submitForm(ctx: PluginContext, requestMeta: RequestMetaLike, input: SubmitInput) {
	try {
		const form = await forms(ctx).get(input.formId);
		if (!form || form.status !== "active") {
			return genericFailure();
		}

		if (isHoneypotTriggered(input.data._hp)) {
			return successPayload(form);
		}

		const rateLimit = await consumeRateLimit(ctx, {
			formId: input.formId,
			ip: requestMeta.ip,
		});
		if (!rateLimit.allowed) {
			return genericFailure();
		}

		const validation = validateSubmission(getFormFields(form), input.data);
		if (!validation.valid) {
			return { success: false, errors: validation.errors };
		}

		const createdAt = new Date().toISOString();
		const submissionId = ulid();
		const submission: Submission = {
			formId: input.formId,
			data: validation.data,
			status: "new",
			createdAt,
			meta: {
				userAgent: requestMeta.userAgent,
				referer: requestMeta.referer,
				country: requestMeta.geo?.country ?? null,
			},
		};

		await submissions(ctx).put(submissionId, submission);

		const submissionCount = await submissions(ctx).count({ formId: input.formId });
		await forms(ctx).put(input.formId, { ...form, submissionCount, lastSubmissionAt: createdAt });

		const fallbackRecipient = normalizeFallbackRecipient(await ctx.kv.get<string>("settings:defaultNotificationEmail"));
		const recipients = resolveNotificationRecipients(form.settings.notifyEmails, fallbackRecipient);
		if (recipients.length > 0 && ctx.email) {
			const text = formatSubmissionText(form, validation.data);
			for (const recipient of recipients) {
				await ctx.email.send({ to: recipient, subject: `New submission: ${form.name}`, text }).catch((error: unknown) => {
					ctx.log.error("Failed to send contact form notification", {
						error: error instanceof Error ? error.message : String(error),
						formId: input.formId,
						submissionId,
						to: recipient,
					});
				});
			}
		}

		return successPayload(form);
	} catch (error) {
		ctx.log.error("Contact form submit failed", {
			error: error instanceof Error ? error.message : String(error),
			formId: input.formId,
		});
		return genericFailure();
	}
}

function successPayload(form: FormDefinition) {
	return { success: true, message: form.settings.confirmationMessage, redirect: form.settings.redirectUrl };
}

function genericFailure() {
	return { success: false, message: "Please try again later." };
}

function normalizeFallbackRecipient(value: string | null | undefined): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}
