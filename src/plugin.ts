import { definePlugin } from "emdash";

import { handleCleanup } from "./handlers/cron.js";
import {
	formsCreateHandler,
	formsDeleteHandler,
	formsListHandler,
	formsUpdateHandler,
} from "./handlers/forms.js";
import { submitHandler } from "./handlers/submit.js";
import {
	exportHandler,
	submissionDeleteHandler,
	submissionGetHandler,
	submissionsListHandler,
	submissionUpdateHandler,
} from "./handlers/submissions.js";
import {
	exportSchema,
	formCreateSchema,
	formDeleteSchema,
	formUpdateSchema,
	submissionsListSchema,
	submitSchema,
	submissionDeleteSchema,
	submissionGetSchema,
	submissionUpdateSchema,
} from "./schemas.js";
import { CONTACT_FORMS_STORAGE } from "./storage.js";

export function createPlugin(_options: Record<string, unknown> = {}) {
	// Release A runtime intentionally stays narrow: no definition route, no uploads, no network fetch.
	return definePlugin({
		id: "masonjames-contact-forms",
		version: "0.1.0",
		capabilities: ["email:send"],
		storage: CONTACT_FORMS_STORAGE,
		hooks: {
			"plugin:install": {
				handler: async (_event, ctx) => {
					await seedSetting(ctx.kv, "settings:defaultNotificationEmail", "");
					await seedSetting(ctx.kv, "settings:retentionDays", 0);
					await seedSetting(ctx.kv, "settings:rateLimitMaxPerHour", 5);
					await seedSetting(ctx.kv, "settings:rateLimitWindowSeconds", 3600);
				},
			},
			"plugin:activate": {
				handler: async (_event, ctx) => {
					if (ctx.cron) {
						await ctx.cron.schedule("cleanup", { schedule: "@weekly" });
					}
				},
			},
			"plugin:deactivate": {
				handler: async (_event, ctx) => {
					if (ctx.cron) {
						await ctx.cron.cancel("cleanup").catch(() => {});
					}
				},
			},
			cron: {
				handler: async (event, ctx) => {
					if (event.name === "cleanup") {
						await handleCleanup(ctx);
					}
				},
			},
		},
		routes: {
			submit: {
				public: true,
				input: submitSchema,
				handler: submitHandler as never,
			},
			"forms/list": {
				handler: formsListHandler,
			},
			"forms/create": {
				input: formCreateSchema,
				handler: formsCreateHandler as never,
			},
			"forms/update": {
				input: formUpdateSchema,
				handler: formsUpdateHandler as never,
			},
			"forms/delete": {
				input: formDeleteSchema,
				handler: formsDeleteHandler as never,
			},
			"submissions/list": {
				input: submissionsListSchema,
				handler: submissionsListHandler as never,
			},
			"submissions/get": {
				input: submissionGetSchema,
				handler: submissionGetHandler as never,
			},
			"submissions/update": {
				input: submissionUpdateSchema,
				handler: submissionUpdateHandler as never,
			},
			"submissions/delete": {
				input: submissionDeleteSchema,
				handler: submissionDeleteHandler as never,
			},
			"submissions/export": {
				input: exportSchema,
				handler: exportHandler as never,
			},
		},
		admin: {
			entry: "@masonjames/emdash-contact-forms/admin",
			settingsSchema: {
				defaultNotificationEmail: {
					type: "string",
					label: "Default notification email",
				},
				retentionDays: {
					type: "number",
					label: "Retention days",
					min: 0,
				},
				rateLimitMaxPerHour: {
					type: "number",
					label: "Rate limit max per hour",
					min: 1,
				},
				rateLimitWindowSeconds: {
					type: "number",
					label: "Rate limit window seconds",
					min: 60,
				},
			},
			pages: [
				{ path: "/", label: "Forms", icon: "list" },
				{ path: "/submissions", label: "Submissions", icon: "inbox" },
			],
			widgets: [{ id: "recent-submissions", title: "Recent Submissions", size: "half" }],
			portableTextBlocks: [
				{
					type: "masonjames-contact-form",
					label: "Contact Form",
					icon: "form",
					description: "Embed a contact form",
					fields: [
						{
							type: "select",
							action_id: "formId",
							label: "Form",
							options: [],
							optionsRoute: "forms/list?mode=options",
						},
					],
				},
			],
		},
	});
}

export default createPlugin;

async function seedSetting(
	kv: { get<T>(key: string): Promise<T | null>; set(key: string, value: unknown): Promise<void> },
	key: string,
	value: unknown,
) {
	const existing = await kv.get(key);
	if (existing === null) {
		await kv.set(key, value);
	}
}
