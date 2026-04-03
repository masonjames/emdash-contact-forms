import { describe, expect, it } from "vitest";

import { consumeRateLimit, hashClientIdentifier, isHoneypotTriggered } from "../../src/domain/security.js";
import { createStandardRouteContext } from "../helpers/mock-plugin.js";

describe("security helpers", () => {
	it("detects honeypot submissions", () => {
		expect(isHoneypotTriggered("")).toBe(false);
		expect(isHoneypotTriggered("bot")).toBe(true);
	});

	it("hashes IP addresses deterministically", async () => {
		const a = await hashClientIdentifier("203.0.113.10");
		const b = await hashClientIdentifier("203.0.113.10");
		expect(a).toBe(b);
		expect(a).not.toContain("203.0.113.10");
	});

	it("expires stale rate-limit state automatically", async () => {
		const hashedIp = await hashClientIdentifier("203.0.113.10");
		const staleKey = `state:rate-limit:form-1:${hashedIp}:2026-04-02T23:00:00.000Z`;
		const { ctx, kv } = createStandardRouteContext({
			input: {},
			kv: {
				"settings:rateLimitMaxPerHour": 1,
				"settings:rateLimitWindowSeconds": 3600,
				[staleKey]: { count: 1, expiresAt: "2026-04-03T00:00:00.000Z" },
			},
		});
		const result = await consumeRateLimit(ctx, { formId: "form-1", ip: "203.0.113.10", now: new Date("2026-04-03T01:00:00.000Z") });
		expect(result.allowed).toBe(true);
		expect(await kv.get(staleKey)).toBeNull();
	});

	it("enforces best-effort rate limits", async () => {
		const { ctx } = createStandardRouteContext({
			input: {},
			kv: {
				"settings:rateLimitMaxPerHour": 1,
				"settings:rateLimitWindowSeconds": 3600,
			},
		});
		const first = await consumeRateLimit(ctx, { formId: "form-1", ip: "203.0.113.10", now: new Date("2026-04-03T00:00:00.000Z") });
		const second = await consumeRateLimit(ctx, { formId: "form-1", ip: "203.0.113.10", now: new Date("2026-04-03T00:10:00.000Z") });
		expect(first.allowed).toBe(true);
		expect(second.allowed).toBe(false);
		expect(second.retryAfterSeconds).toBeGreaterThan(0);
	});
});
