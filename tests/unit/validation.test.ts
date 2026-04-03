import { describe, expect, it } from "vitest";

import type { FormPage } from "../../src/types.js";
import {
	coerceCheckboxValue,
	normalizeFieldName,
	normalizeSlug,
	validateFormDefinition,
	validateSubmission,
} from "../../src/validation.js";

describe("validation helpers", () => {
	it("normalizes slugs and field names", () => {
		expect(normalizeSlug("Contact Us!")).toBe("contact-us");
		expect(normalizeFieldName("Email Address")).toBe("email_address");
		expect(normalizeFieldName("1st Name")).toBe("_1st_name");
	});

	it("rejects invalid form definitions", () => {
		const pages: FormPage[] = [
			{
				fields: [
					{ id: "1", type: "text", label: "Name", name: "name", required: true },
					{ id: "2", type: "text", label: "Name Again", name: "name", required: false },
				],
			},
			{
				fields: [],
			},
		];

		const result = validateFormDefinition({
			pages,
			settings: { redirectUrl: "javascript:alert(1)" },
		});

		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Duplicate field name "name"');
		expect(result.errors).toContain("Release A forms support exactly one page");
		expect(result.errors).toContain("Redirect URL must use http or https");
	});

	it("validates submissions against declared fields only", () => {
		const fields = [
			{ id: "1", type: "text", label: "Name", name: "name", required: true },
			{ id: "2", type: "email", label: "Email", name: "email", required: true },
			{ id: "3", type: "select", label: "Reason", name: "reason", required: true, options: [{ label: "Sales", value: "sales" }] },
			{ id: "4", type: "checkbox", label: "Consent", name: "consent", required: true },
		] as const;

		const result = validateSubmission(fields as never, {
			name: "Ada",
			email: "ada@example.com",
			reason: "sales",
			consent: "on",
			unexpected: "ignored",
		});

		expect(result.valid).toBe(true);
		expect(result.data).toEqual({
			name: "Ada",
			email: "ada@example.com",
			reason: "sales",
			consent: true,
		});
		expect("unexpected" in result.data).toBe(false);
	});

	it("rejects missing required text fields", () => {
		const fields = [
			{ id: "1", type: "text", label: "Name", name: "name", required: true },
		] as const;

		const result = validateSubmission(fields as never, {
			name: "",
		});

		expect(result.valid).toBe(false);
		expect(result.errors).toEqual([{ field: "name", message: "Name is required" }]);
	});

	it("rejects invalid select values", () => {
		const fields = [
			{
				id: "1",
				type: "select",
				label: "Reason",
				name: "reason",
				required: true,
				options: [{ label: "Sales", value: "sales" }],
			},
		] as const;

		const result = validateSubmission(fields as never, {
			reason: "support",
		});

		expect(result.valid).toBe(false);
		expect(result.errors).toEqual([{ field: "reason", message: "Reason has an invalid selection" }]);
	});

	it("reports invalid email and missing required checkbox", () => {
		const fields = [
			{ id: "1", type: "email", label: "Email", name: "email", required: true },
			{ id: "2", type: "checkbox", label: "Consent", name: "consent", required: true },
		] as const;

		const result = validateSubmission(fields as never, {
			email: "not-an-email",
		});

		expect(result.valid).toBe(false);
		expect(result.errors).toEqual([
			{ field: "email", message: "Email must be a valid email address" },
			{ field: "consent", message: "Consent is required" },
		]);
	});

	it("coerces checkbox inputs consistently", () => {
		expect(coerceCheckboxValue(true)).toBe(true);
		expect(coerceCheckboxValue("on")).toBe(true);
		expect(coerceCheckboxValue("1")).toBe(true);
		expect(coerceCheckboxValue("false")).toBe(false);
		expect(coerceCheckboxValue(undefined)).toBe(false);
	});
});
