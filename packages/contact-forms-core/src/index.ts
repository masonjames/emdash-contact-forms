import type { PluginDescriptor } from "emdash";

import { CONTACT_FORMS_STORAGE } from "./domain/storage.js";

export function contactFormsCorePlugin(): PluginDescriptor {
	return {
		id: "masonjames-contact-forms-core",
		version: "0.1.0",
		format: "standard",
		entrypoint: "@masonjames/emdash-contact-forms-core/sandbox",
		capabilities: ["email:send"],
		allowedHosts: [],
		storage: CONTACT_FORMS_STORAGE as PluginDescriptor["storage"],
		adminPages: [
			{ path: "/", label: "Forms", icon: "list" },
			{ path: "/submissions", label: "Submissions", icon: "inbox" },
			{ path: "/settings", label: "Settings", icon: "settings" },
		],
		adminWidgets: [{ id: "recent-submissions", title: "Recent Submissions", size: "half" }],
	};
}

export type * from "./domain/types.js";
