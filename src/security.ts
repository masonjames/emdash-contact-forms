import type { KVAccess, PluginContext, RouteContext } from "emdash";

const DEFAULT_MAX_PER_WINDOW = 5;
const DEFAULT_WINDOW_SECONDS = 3600;

type KvCapable = Pick<RouteContext, "kv"> | Pick<PluginContext, "kv">;

export interface RateLimitResult {
	allowed: boolean;
	retryAfterSeconds?: number;
}

interface RateLimitState {
	count: number;
	expiresAt: string;
}

export function isHoneypotTriggered(value: unknown): boolean {
	return typeof value === "string" ? value.trim().length > 0 : value != null;
}

export async function hashClientIdentifier(ip: string): Promise<string> {
	const bytes = new TextEncoder().encode(ip);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function loadRateLimitSettings(ctx: KvCapable): Promise<{
	maxPerWindow: number;
	windowSeconds: number;
}> {
	const maxPerWindow = clampPositiveNumber(
		await ctx.kv.get<number>("settings:rateLimitMaxPerHour"),
		DEFAULT_MAX_PER_WINDOW,
	);
	const windowSeconds = clampPositiveNumber(
		await ctx.kv.get<number>("settings:rateLimitWindowSeconds"),
		DEFAULT_WINDOW_SECONDS,
	);

	return { maxPerWindow, windowSeconds };
}

export async function consumeRateLimit(
	ctx: KvCapable,
	args: {
		formId: string;
		ip: string | null | undefined;
		now?: Date;
	},
): Promise<RateLimitResult> {
	if (!args.ip) return { allowed: true };

	const now = args.now ?? new Date();
	const { maxPerWindow, windowSeconds } = await loadRateLimitSettings(ctx);
	const windowMs = windowSeconds * 1000;
	const bucketStartMs = Math.floor(now.getTime() / windowMs) * windowMs;
	const bucketStart = new Date(bucketStartMs).toISOString();
	const expiresAt = new Date(bucketStartMs + windowMs).toISOString();
	const retryAfterSeconds = Math.max(1, Math.ceil((bucketStartMs + windowMs - now.getTime()) / 1000));
	const hashedIp = await hashClientIdentifier(args.ip);
	const prefix = `state:rate-limit:${args.formId}:${hashedIp}:`;
	const key = `${prefix}${bucketStart}`;

	const existingEntries = await ctx.kv.list(prefix);
	let currentCount = 0;

	for (const entry of existingEntries) {
		const state = normalizeRateLimitState(entry.value);
		if (!state) continue;

		if (Date.parse(state.expiresAt) <= now.getTime()) {
			await ctx.kv.delete(entry.key);
			continue;
		}

		if (entry.key === key) {
			currentCount = state.count;
		}
	}

	if (currentCount >= maxPerWindow) {
		return { allowed: false, retryAfterSeconds };
	}

	await ctx.kv.set(key, {
		count: currentCount + 1,
		expiresAt,
	} satisfies RateLimitState);

	return { allowed: true };
}

function clampPositiveNumber(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeRateLimitState(value: unknown): RateLimitState | null {
	if (typeof value !== "object" || value === null) return null;
	if (!("count" in value) || !("expiresAt" in value)) return null;
	const count = value.count;
	const expiresAt = value.expiresAt;
	if (typeof count !== "number" || !Number.isFinite(count) || typeof expiresAt !== "string") {
		return null;
	}
	return { count, expiresAt };
}
