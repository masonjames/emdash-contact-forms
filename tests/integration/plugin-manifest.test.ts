import { describe, expect, it } from "vitest";

import { contactFormsPlugin } from "../../src/index.js";
import { createPlugin } from "../../src/plugin.js";

describe("plugin manifest", () => {
	it("requests only email sending in the descriptor", () => {
		const descriptor = contactFormsPlugin();
		expect(descriptor.capabilities).toEqual(["email:send"]);
	});

	it("exposes only submit as a public runtime route", () => {
		const plugin = createPlugin() as {
			routes: Record<string, { public?: boolean }>;
		};

		const publicRoutes = Object.entries(plugin.routes)
			.filter(([, route]) => route.public)
			.map(([routeId]) => routeId);

		expect(publicRoutes).toEqual(["submit"]);
		expect(plugin.routes).not.toHaveProperty("definition");
		expect(plugin.routes).not.toHaveProperty("settings/turnstile-status");
	});

	it("registers CRUD input schemas that reject malformed payloads", () => {
		const plugin = createPlugin() as {
			routes: Record<string, { input?: { safeParse: (value: unknown) => { success: boolean } } }>;
		};

		expect(
			plugin.routes["forms/create"].input?.safeParse({
				name: "",
				slug: "Bad Slug",
				pages: [],
				settings: { confirmationMessage: "", notifyEmails: ["bad-email"], submitLabel: "" },
			}).success,
		).toBe(false);
		expect(
			plugin.routes["forms/update"].input?.safeParse({
				id: "",
				status: "broken",
			}).success,
		).toBe(false);
		expect(plugin.routes["forms/delete"].input?.safeParse({}).success).toBe(false);
	});
});
