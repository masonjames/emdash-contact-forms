import { describe, expect, it } from "vitest";

import { handleCleanup } from "../../src/handlers/cron.js";
import { createForm, createPluginContext, createSubmission } from "../helpers/mock-plugin.js";

describe("cleanup cron", () => {
	it("deletes expired submissions and recomputes form stats", async () => {
		const form = createForm({
			submissionCount: 2,
			lastSubmissionAt: "2026-04-02T00:00:00.000Z",
		});
		const { ctx, submissionsCollection, formsCollection } = createPluginContext({
			forms: [{ id: "form-1", data: form }],
			submissions: [
				{
					id: "sub-old",
					data: createSubmission({
						createdAt: "2026-03-01T00:00:00.000Z",
					}),
				},
				{
					id: "sub-new",
					data: createSubmission({
						createdAt: "2026-04-02T00:00:00.000Z",
					}),
				},
			],
			kv: {
				"settings:retentionDays": 7,
			},
		});

		await handleCleanup(ctx);

		expect(await submissionsCollection.get("sub-old")).toBeNull();
		expect(await submissionsCollection.get("sub-new")).not.toBeNull();
		const updatedForm = await formsCollection.get("form-1");
		expect(updatedForm?.submissionCount).toBe(1);
		expect(updatedForm?.lastSubmissionAt).toBe("2026-04-02T00:00:00.000Z");
	});
});
