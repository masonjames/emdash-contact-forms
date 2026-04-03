import { describe, expect, it } from "vitest";

import { contactFormsCorePlugin } from "../../src/index.js";
import plugin from "../../src/sandbox-entry.js";

describe("plugin manifest", () => {
	it("uses standard descriptor metadata", () => {
		const descriptor = contactFormsCorePlugin();
		expect(descriptor.id).toBe("masonjames-contact-forms-core");
		expect(descriptor.format).toBe("standard");
		expect(descriptor.entrypoint).toBe("@masonjames/emdash-contact-forms-core/sandbox");
		expect(descriptor.capabilities).toEqual(["email:send"]);
		expect(descriptor.allowedHosts).toEqual([]);
		expect(descriptor).not.toHaveProperty("adminEntry");
		expect(descriptor).not.toHaveProperty("componentsEntry");
	});

	it("exposes submit and admin routes in sandbox runtime", () => {
		const runtime = plugin as { routes: Record<string, { public?: boolean }> };
		expect(runtime.routes).toHaveProperty("submit");
		expect(runtime.routes).toHaveProperty("admin");
		const publicRoutes = Object.entries(runtime.routes).filter(([, route]) => route.public).map(([id]) => id);
		expect(publicRoutes).toEqual(["submit"]);
	});
});
