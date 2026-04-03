import type { PluginDescriptor } from "emdash";

import { CONTACT_FORMS_STORAGE } from "./storage.js";

export interface ContactFormsPluginOptions {}

export function contactFormsPlugin(
	options: ContactFormsPluginOptions = {},
): PluginDescriptor<ContactFormsPluginOptions> {
	// Release A trusted/native scope: email sending only, with a single public submit route.
	return {
		id: "masonjames-contact-forms",
		version: "0.1.0",
		entrypoint: "@masonjames/emdash-contact-forms/plugin",
		adminEntry: "@masonjames/emdash-contact-forms/admin",
		componentsEntry: "@masonjames/emdash-contact-forms/astro",
		options,
		capabilities: ["email:send"],
		storage: {
			forms: CONTACT_FORMS_STORAGE.forms,
			submissions: {
				indexes: ["formId", "status", "createdAt"],
			},
		},
		adminPages: [
			{ path: "/", label: "Forms", icon: "list" },
			{ path: "/submissions", label: "Submissions", icon: "inbox" },
		],
		adminWidgets: [{ id: "recent-submissions", title: "Recent Submissions", size: "half" }],
	};
}

export default contactFormsPlugin;

export type * from "./types.js";
