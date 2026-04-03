import { describe, expect, it } from "vitest";

import { submitHandler } from "../../src/handlers/submit.js";
import { createForm, createRouteContext } from "../helpers/mock-plugin.js";

describe("submit route", () => {
	it("accepts valid submissions, stores them, and sends notifications", async () => {
		const { ctx, sentEmails, submissionsCollection, formsCollection } = createRouteContext({
			input: {
				formId: "form-1",
				data: {
					name: "Ada",
					email: "ada@example.com",
					message: "Hello",
					_hp: "",
				},
			},
			forms: [{ id: "form-1", data: createForm() }],
		});

		const result = await submitHandler(ctx);
		const storedCount = await submissionsCollection.count({ formId: "form-1" });
		const storedForm = await formsCollection.get("form-1");
		const rows = await submissionsCollection.query();

		expect(result).toEqual({
			success: true,
			message: "Thanks!",
			redirect: undefined,
		});
		expect(storedCount).toBe(1);
		expect(sentEmails).toHaveLength(1);
		expect(storedForm?.submissionCount).toBe(1);
		expect(rows.items[0]?.data.meta).toEqual({
			userAgent: "Vitest",
			referer: "https://example.com/contact",
			country: "US",
		});
		expect("ip" in (rows.items[0]?.data.meta ?? {})).toBe(false);
	});

	it("treats honeypot trips as successful without storing data", async () => {
		const { ctx, submissionsCollection } = createRouteContext({
			input: {
				formId: "form-1",
				data: {
					name: "Bot",
					email: "bot@example.com",
					message: "Spam",
					_hp: "filled",
				},
			},
			forms: [{ id: "form-1", data: createForm() }],
		});

		const result = await submitHandler(ctx);

		expect(result).toEqual({
			success: true,
			message: "Thanks!",
			redirect: undefined,
		});
		expect(await submissionsCollection.count()).toBe(0);
	});

	it("rejects paused forms with a generic error", async () => {
		const { ctx, submissionsCollection } = createRouteContext({
			input: {
				formId: "form-1",
				data: {
					name: "Ada",
					email: "ada@example.com",
					message: "Hello",
					_hp: "",
				},
			},
			forms: [{ id: "form-1", data: createForm({ status: "paused" }) }],
		});

		const result = await submitHandler(ctx);
		expect(result).toEqual({
			success: false,
			message: "Please try again later.",
		});
		expect(await submissionsCollection.count()).toBe(0);
	});

	it("rate limits repeat abusive submissions with a generic error", async () => {
		const createCtx = () =>
			createRouteContext({
				input: {
					formId: "form-1",
					data: {
						name: "Ada",
						email: "ada@example.com",
						message: "Hello",
						_hp: "",
					},
				},
				forms: [{ id: "form-1", data: createForm() }],
				kv: {
					"settings:rateLimitMaxPerHour": 1,
					"settings:rateLimitWindowSeconds": 3600,
				},
			});

		const first = createCtx();
		const second = createCtx();
		second.kv.set = first.kv.set.bind(first.kv);
		second.kv.get = first.kv.get.bind(first.kv);
		second.kv.list = first.kv.list.bind(first.kv);
		second.kv.delete = first.kv.delete.bind(first.kv);

		expect(await submitHandler(first.ctx)).toMatchObject({ success: true });
		expect(await submitHandler(second.ctx)).toEqual({
			success: false,
			message: "Please try again later.",
		});
	});

	it("returns field-level validation errors", async () => {
		const { ctx } = createRouteContext({
			input: {
				formId: "form-1",
				data: {
					name: "",
					email: "not-an-email",
					message: "",
					_hp: "",
				},
			},
			forms: [{ id: "form-1", data: createForm() }],
		});

		const result = await submitHandler(ctx);
		expect(result).toMatchObject({
			success: false,
			errors: [
				{ field: "name" },
				{ field: "email" },
				{ field: "message" },
			],
		});
	});
});
