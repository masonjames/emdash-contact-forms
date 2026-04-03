import { describe, expect, it } from "vitest";

import { formatCsv, formatSubmissionText, resolveNotificationRecipients } from "../../src/domain/format.js";
import { createForm, createSubmission } from "../helpers/mock-plugin.js";

describe("format helpers", () => {
	it("falls back to plugin-level notification recipient", () => {
		expect(resolveNotificationRecipients([], "ops@example.com")).toEqual(["ops@example.com"]);
		expect(resolveNotificationRecipients(["team@example.com", "team@example.com"], "ops@example.com")).toEqual(["team@example.com"]);
	});

	it("formats submissions for plain-text email", () => {
		const form = createForm();
		const text = formatSubmissionText(form, { name: "Ada", email: "ada@example.com", message: "Hello!" });
		expect(text).toContain("New submission: Contact us");
		expect(text).toContain("Name: Ada");
		expect(text).toContain("Message: Hello!");
	});

	it("exports CSV with orphan keys and formula escaping", () => {
		const form = createForm();
		const csv = formatCsv(form, [{ id: "sub-1", data: createSubmission({ data: { name: "=2+2", email: "ada@example.com", message: "Hello", legacy_key: "legacy" } }) }]);
		expect(csv).toContain("legacy_key");
		expect(csv).toContain("'=2+2");
	});
});
