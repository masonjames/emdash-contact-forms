import { describe, expect, it } from "vitest";

import {
	exportHandler,
	submissionDeleteHandler,
	submissionGetHandler,
	submissionsListHandler,
	submissionUpdateHandler,
} from "../../src/handlers/submissions.js";
import { createForm, createRouteContext, createSubmission } from "../helpers/mock-plugin.js";

describe("submissions routes", () => {
	it("lists summary rows and fetches details", async () => {
		const form = createForm();
		const { ctx } = createRouteContext({
			input: { formId: "form-1", limit: 50 },
			forms: [{ id: "form-1", data: form }],
			submissions: [
				{ id: "sub-1", data: createSubmission() },
			],
		});

		const list = await submissionsListHandler(ctx);
		expect(list.items[0]).toMatchObject({
			id: "sub-1",
			formName: "Contact us",
			status: "new",
		});

		const detailCtx = createRouteContext({
			input: { id: "sub-1" },
			forms: [{ id: "form-1", data: form }],
			submissions: [{ id: "sub-1", data: createSubmission() }],
		}).ctx;
		const detail = await submissionGetHandler(detailCtx);
		expect(detail.formName).toBe("Contact us");
	});

	it("updates, deletes, and exports submissions", async () => {
		const form = createForm({
			submissionCount: 2,
			lastSubmissionAt: "2026-04-03T00:00:00.000Z",
		});
		const older = createSubmission({ createdAt: "2026-04-02T00:00:00.000Z" });
		const newer = createSubmission({ createdAt: "2026-04-03T00:00:00.000Z" });

		const updateCtx = createRouteContext({
			input: { id: "sub-1", status: "read" as const },
			forms: [{ id: "form-1", data: form }],
			submissions: [{ id: "sub-1", data: newer }],
		}).ctx;
		const updated = await submissionUpdateHandler(updateCtx);
		expect(updated.status).toBe("read");

		const deleteEnv = createRouteContext({
			input: { id: "sub-2" },
			forms: [{ id: "form-1", data: form }],
			submissions: [
				{ id: "sub-1", data: older },
				{ id: "sub-2", data: newer },
			],
		});
		await submissionDeleteHandler(deleteEnv.ctx);
		const recomputedForm = await deleteEnv.formsCollection.get("form-1");
		expect(recomputedForm?.submissionCount).toBe(1);
		expect(recomputedForm?.lastSubmissionAt).toBe("2026-04-02T00:00:00.000Z");

		const exportCtx = createRouteContext({
			input: { formId: "form-1" },
			forms: [{ id: "form-1", data: form }],
			submissions: [{ id: "sub-1", data: older }],
		}).ctx;
		const exported = await exportHandler(exportCtx);
		expect(exported.contentType).toBe("text/csv");
		expect(exported.filename).toContain("contact-us-submissions-");
		expect(exported.data).toContain("ID,Submitted At,Status");
	});
});
