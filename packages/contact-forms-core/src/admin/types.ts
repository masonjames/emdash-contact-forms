import type { Block, BlockResponse } from "@emdash-cms/blocks";

export type AdminPage = "/" | "/submissions" | "/settings" | "widget:recent-submissions";

export type AdminInteraction =
	| { type: "page_load"; page: AdminPage }
	| { type: "block_action"; action_id: string; value?: unknown; page?: AdminPage }
	| { type: "form_submit"; action_id: string; values: Record<string, unknown>; page?: AdminPage };

export type { Block };
export type AdminToast = NonNullable<BlockResponse["toast"]>;

export interface AdminResponse {
	blocks: Block[];
	toast?: AdminToast;
}

export const ADMIN_ACTIONS = {
	settingsSave: "settings:save",
	submissionsFilter: "submissions:filter",
	submissionsView: "submissions:view",
	formsCreate: "forms:create",
	formsEdit: "forms:edit",
	formsToggleStatus: "forms:toggle-status",
	formsDelete: "forms:delete",
	submissionsSetStatus: "submissions:set-status",
	submissionsDelete: "submissions:delete",
	submissionsExport: "submissions:export",
} as const;
