import { definePlugin } from "emdash";
import type { PluginContext, RouteContext } from "emdash";

import { handleAdminRoute } from "./admin/route.js";
import { submitSchema } from "./domain/schemas.js";
import type { SubmitInput } from "./domain/schemas.js";
import { handleCleanup } from "./services/cron.js";
import { submitForm } from "./services/submit.js";

type RequestMetaLike = RouteContext["requestMeta"];

export default definePlugin({
	hooks: {
		"plugin:install": async (_event: unknown, ctx: PluginContext) => {
			await seedSetting(ctx, "settings:defaultNotificationEmail", "");
			await seedSetting(ctx, "settings:retentionDays", 0);
			await seedSetting(ctx, "settings:rateLimitMaxPerHour", 5);
			await seedSetting(ctx, "settings:rateLimitWindowSeconds", 3600);
		},
		"plugin:activate": async (_event: unknown, ctx: PluginContext) => {
			if (ctx.cron) {
				await ctx.cron.schedule("cleanup", { schedule: "@weekly" });
			}
		},
		"plugin:deactivate": async (_event: unknown, ctx: PluginContext) => {
			if (ctx.cron) {
				await ctx.cron.cancel("cleanup").catch(() => {});
			}
		},
		cron: async (event: { name?: string }, ctx: PluginContext) => {
			if (event.name === "cleanup") {
				await handleCleanup(ctx);
			}
		},
	},
	routes: {
		submit: {
			public: true,
			input: submitSchema,
			handler: async (
				routeCtx: { input: SubmitInput; request: Request; requestMeta?: RequestMetaLike },
				ctx: PluginContext,
			) => submitForm(ctx, routeCtx.requestMeta ?? requestMetaFromRequest(routeCtx.request), routeCtx.input),
		},
		admin: {
			handler: async (
				routeCtx: { input: unknown; request: Request; requestMeta?: RequestMetaLike },
				ctx: PluginContext,
			) => handleAdminRoute(routeCtx, ctx),
		},
	},
});

async function seedSetting(ctx: Pick<PluginContext, "kv">, key: string, value: unknown) {
	const existing = await ctx.kv.get(key);
	if (existing === null) {
		await ctx.kv.set(key, value);
	}
}

function requestMetaFromRequest(request: Request): RequestMetaLike {
	const forwardedFor = request.headers.get("x-forwarded-for");
	const ip = forwardedFor ? forwardedFor.split(",")[0]?.trim() ?? null : null;
	return {
		ip,
		userAgent: request.headers.get("user-agent"),
		referer: request.headers.get("referer"),
		geo: null,
	};
}
