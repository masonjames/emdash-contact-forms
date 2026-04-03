import { describe, expect, it } from "vitest";

import plugin from "../../src/sandbox-entry.js";
import { createForm, createStandardRouteContext } from "../helpers/mock-plugin.js";

const runtime = plugin as {
	routes: {
		submit: { handler: (routeCtx: unknown, ctx: unknown) => Promise<unknown> };
	};
};

describe("submit route", () => {
	it("accepts valid submissions, stores them, and sends notifications", async () => {
		const env = createStandardRouteContext({
			input: { formId: "form-1", data: { name: "Ada", email: "ada@example.com", message: "Hello", _hp: "" } },
			forms: [{ id: "form-1", data: createForm() }],
		});
		const result = await runtime.routes.submit.handler(env.routeCtx, env.ctx) as Record<string, unknown>;
		const storedCount = await env.submissionsCollection.count({ formId: "form-1" });
		const storedForm = await env.formsCollection.get("form-1");
		const rows = await env.submissionsCollection.query();
		expect(result).toEqual({ success: true, message: "Thanks!", redirect: undefined });
		expect(storedCount).toBe(1);
		expect(env.sentEmails).toHaveLength(1);
		expect(storedForm?.submissionCount).toBe(1);
		expect(rows.items[0]?.data.meta).toEqual({ userAgent: "Vitest", referer: "https://example.com/contact", country: "US" });
		expect("ip" in (rows.items[0]?.data.meta ?? {})).toBe(false);
	});

	it("treats honeypot trips as successful without storing data", async () => {
		const env = createStandardRouteContext({
			input: { formId: "form-1", data: { name: "Bot", email: "bot@example.com", message: "Spam", _hp: "filled" } },
			forms: [{ id: "form-1", data: createForm() }],
		});
		const result = await runtime.routes.submit.handler(env.routeCtx, env.ctx);
		expect(result).toEqual({ success: true, message: "Thanks!", redirect: undefined });
		expect(await env.submissionsCollection.count()).toBe(0);
	});

	it("rejects paused forms with a generic error", async () => {
		const env = createStandardRouteContext({
			input: { formId: "form-1", data: { name: "Ada", email: "ada@example.com", message: "Hello", _hp: "" } },
			forms: [{ id: "form-1", data: createForm({ status: "paused" }) }],
		});
		const result = await runtime.routes.submit.handler(env.routeCtx, env.ctx);
		expect(result).toEqual({ success: false, message: "Please try again later." });
		expect(await env.submissionsCollection.count()).toBe(0);
	});

	it("rate limits repeat abusive submissions with a generic error", async () => {
		const first = createStandardRouteContext({
			input: { formId: "form-1", data: { name: "Ada", email: "ada@example.com", message: "Hello", _hp: "" } },
			forms: [{ id: "form-1", data: createForm() }],
			kv: { "settings:rateLimitMaxPerHour": 1, "settings:rateLimitWindowSeconds": 3600 },
		});
		const second = createStandardRouteContext({
			input: { formId: "form-1", data: { name: "Ada", email: "ada@example.com", message: "Hello", _hp: "" } },
			forms: [{ id: "form-1", data: createForm() }],
			kv: {},
		});
		second.kv.set = first.kv.set.bind(first.kv);
		second.kv.get = first.kv.get.bind(first.kv);
		second.kv.list = first.kv.list.bind(first.kv);
		second.kv.delete = first.kv.delete.bind(first.kv);
		expect(await runtime.routes.submit.handler(first.routeCtx, first.ctx)).toMatchObject({ success: true });
		expect(await runtime.routes.submit.handler(second.routeCtx, second.ctx)).toEqual({ success: false, message: "Please try again later." });
	});
});
