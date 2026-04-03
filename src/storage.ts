import type { PluginStorageConfig } from "emdash";

export type ContactFormsStorage = PluginStorageConfig & {
	forms: {
		indexes: ["status", "createdAt"];
		uniqueIndexes: ["slug"];
	};
	submissions: {
		indexes: ["formId", "status", "createdAt", ["formId", "createdAt"]];
	};
};

export const CONTACT_FORMS_STORAGE = {
	forms: {
		indexes: ["status", "createdAt"] as const,
		uniqueIndexes: ["slug"] as const,
	},
	submissions: {
		indexes: ["formId", "status", "createdAt", ["formId", "createdAt"]] as const,
	},
} satisfies PluginStorageConfig;
