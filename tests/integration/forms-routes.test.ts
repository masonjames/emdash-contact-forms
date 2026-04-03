import { describe, expect, it } from "vitest";

import { formsCreateHandler, formsDeleteHandler, formsUpdateHandler } from "../../src/handlers/forms.js";
import { createForm, createRouteContext } from "../helpers/mock-plugin.js";

describe("forms routes", () => {
	it("creates a form", async () => {
		const { ctx, formsCollection } = createRouteContext({
			input: {
				name: "Contact us",
				slug: "contact-us",
				pages: [
					{
						fields: [{ id: "field-1", type: "text" as const, label: "Name", name: "name", required: true }],
					},
				],
				settings: {
					confirmationMessage: "Thanks!",
					redirectUrl: "",
					notifyEmails: ["team@example.com"],
					submitLabel: "Send",
				},
			},
		});

		const created = await formsCreateHandler(ctx);
		const stored = await formsCollection.get(created.id);

		expect(created.slug).toBe("contact-us");
		expect(stored?.settings.notifyEmails).toEqual(["team@example.com"]);
	});

	it("rejects duplicate slugs", async () => {
		const { ctx } = createRouteContext({
			input: {
				name: "Another",
				slug: "contact-us",
				pages: [{ fields: [{ id: "field-1", type: "text" as const, label: "Name", name: "name", required: true }] }],
				settings: {
					confirmationMessage: "Thanks!",
					redirectUrl: "",
					notifyEmails: [],
					submitLabel: "Send",
				},
			},
			forms: [{ id: "form-1", data: createForm() }],
		});

		await expect(formsCreateHandler(ctx)).rejects.toMatchObject({ code: "CONFLICT" });
	});

	it("updates and deletes forms", async () => {
		const { ctx, formsCollection } = createRouteContext({
			input: {
				id: "form-1",
				name: "Updated form",
				status: "paused" as const,
			},
			forms: [{ id: "form-1", data: createForm() }],
		});

		const updated = await formsUpdateHandler(ctx);
		expect(updated.name).toBe("Updated form");
		expect(updated.status).toBe("paused");

		const deleteCtx = createRouteContext({
			input: { id: "form-1" },
			forms: [{ id: "form-1", data: (await formsCollection.get("form-1"))! }],
		}).ctx;

		const deleted = await formsDeleteHandler(deleteCtx);
		expect(deleted).toEqual({ deleted: true });
	});
});
