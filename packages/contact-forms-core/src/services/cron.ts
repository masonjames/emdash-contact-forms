import type { PluginContext, StorageCollection } from "emdash";

import type { Submission } from "../domain/types.js";
import { recomputeFormStats } from "./submissions.js";

function submissions(ctx: PluginContext): StorageCollection<Submission> {
	return ctx.storage.submissions as StorageCollection<Submission>;
}

export async function handleCleanup(ctx: PluginContext) {
	const retentionDays = normalizeRetentionDays(await ctx.kv.get<number>("settings:retentionDays"));
	if (retentionDays <= 0) return;

	const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
	const affectedFormIds = new Set<string>();
	let deletedCount = 0;

	for (;;) {
		const batch = await submissions(ctx).query({ where: { createdAt: { lt: cutoff } }, orderBy: { createdAt: "asc" }, limit: 100 });
		if (batch.items.length === 0) break;
		for (const item of batch.items) affectedFormIds.add(item.data.formId);
		deletedCount += batch.items.length;
		await submissions(ctx).deleteMany(batch.items.map((item) => item.id));
	}

	for (const formId of affectedFormIds) {
		await recomputeFormStats(ctx, formId);
	}

	if (deletedCount > 0) {
		ctx.log.info("Cleaned up expired contact form submissions", {
			deletedCount,
			formCount: affectedFormIds.size,
		});
	}
}

function normalizeRetentionDays(value: number | null): number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}
