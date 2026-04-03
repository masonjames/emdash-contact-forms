import { validateBlocks } from "@emdash-cms/blocks";
import { describe, expect, it } from "vitest";

import plugin from "../../src/sandbox-entry.js";
import { createForm, createStandardRouteContext, createSubmission } from "../helpers/mock-plugin.js";

const runtime = plugin as {
	routes: {
		admin: { handler: (routeCtx: unknown, ctx: unknown) => Promise<{ blocks: Array<Record<string, unknown>>; toast?: { message: string; type: string } }> };
	};
};

describe("admin route", () => {
	it("renders forms page blocks", async () => {
		const env = createStandardRouteContext({
			input: { type: "page_load", page: "/" },
			forms: [{ id: "form-1", data: createForm() }],
		});
		const result = await runtime.routes.admin.handler(env.routeCtx, env.ctx);
		expect(result.blocks[0]?.text).toBe("Forms");
		expect(JSON.stringify(result.blocks)).toContain("Contact us");
		expect(validateBlocks(result.blocks).valid).toBe(true);
	});

	it("renders submissions and detail blocks", async () => {
		const env = createStandardRouteContext({
			input: { type: "block_action", action_id: "submissions:view", value: "sub-1", page: "/submissions" },
			forms: [{ id: "form-1", data: createForm() }],
			submissions: [{ id: "sub-1", data: createSubmission() }],
		});
		const result = await runtime.routes.admin.handler(env.routeCtx, env.ctx);
		expect(JSON.stringify(result.blocks)).toContain("Submission detail");
		expect(JSON.stringify(result.blocks)).toContain("Ada Lovelace");
	});

	it("saves settings through form_submit", async () => {
		const env = createStandardRouteContext({
			input: {
				type: "form_submit",
				action_id: "settings:save",
				values: {
					defaultNotificationEmail: "ops@example.com",
					retentionDays: "14",
					rateLimitMaxPerHour: "9",
					rateLimitWindowSeconds: "1800",
				},
				page: "/settings",
			},
		});
		const result = await runtime.routes.admin.handler(env.routeCtx, env.ctx);
		expect(result.toast).toEqual({ message: "Settings saved.", type: "success" });
		expect(await env.kv.get("settings:defaultNotificationEmail")).toBe("ops@example.com");
		expect(await env.kv.get("settings:retentionDays")).toBe(14);
		expect(await env.kv.get("settings:rateLimitMaxPerHour")).toBe(9);
		expect(await env.kv.get("settings:rateLimitWindowSeconds")).toBe(1800);
	});

	it("renders recent-submissions widget blocks", async () => {
		const env = createStandardRouteContext({
			input: { type: "page_load", page: "widget:recent-submissions" },
			forms: [{ id: "form-1", data: createForm() }],
			submissions: [{ id: "sub-1", data: createSubmission() }],
		});
		const result = await runtime.routes.admin.handler(env.routeCtx, env.ctx);
		expect(JSON.stringify(result.blocks)).toContain("Ada Lovelace");
	});
});
