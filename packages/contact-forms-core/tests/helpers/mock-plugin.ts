import type {
	KVAccess,
	PluginContext,
	RouteContext,
	StorageCollection,
} from "emdash";

import type { FormDefinition, Submission } from "../../src/domain/types.js";

type QueryWhere = Record<string, unknown>;
type QueryResult<T> = {
	items: Array<{ id: string; data: T }>;
	cursor?: string;
	hasMore: boolean;
};

class MemoryCollection<T> implements StorageCollection<T> {
	private items = new Map<string, T>();

	constructor(seed: Array<{ id: string; data: T }> = []) {
		for (const item of seed) this.items.set(item.id, item.data);
	}

	async get(id: string): Promise<T | null> { return this.items.get(id) ?? null; }
	async put(id: string, data: T): Promise<void> { this.items.set(id, data); }
	async delete(id: string): Promise<boolean> { return this.items.delete(id); }
	async exists(id: string): Promise<boolean> { return this.items.has(id); }
	async getMany(ids: string[]): Promise<Map<string, T>> {
		const result = new Map<string, T>();
		for (const id of ids) {
			const value = this.items.get(id);
			if (value !== undefined) result.set(id, value);
		}
		return result;
	}
	async putMany(items: Array<{ id: string; data: T }>): Promise<void> {
		for (const item of items) this.items.set(item.id, item.data);
	}
	async deleteMany(ids: string[]): Promise<number> {
		let count = 0;
		for (const id of ids) if (this.items.delete(id)) count += 1;
		return count;
	}
	async query(options: { where?: QueryWhere; orderBy?: Record<string, "asc" | "desc">; limit?: number; cursor?: string } = {}): Promise<QueryResult<T>> {
		const limit = options.limit ?? 50;
		const start = options.cursor ? Number(options.cursor) : 0;
		const orderEntries = Object.entries(options.orderBy ?? {});
		let rows = [...this.items.entries()].map(([id, data]) => ({ id, data }));
		if (options.where) rows = rows.filter((row) => matchesWhere(row.data, options.where!));
		if (orderEntries.length > 0) rows.sort((a, b) => compareByOrder(a.data, b.data, orderEntries));
		const page = rows.slice(start, start + limit);
		const nextCursor = start + limit < rows.length ? String(start + limit) : undefined;
		return { items: page, cursor: nextCursor, hasMore: nextCursor !== undefined };
	}
	async count(where?: QueryWhere): Promise<number> {
		if (!where) return this.items.size;
		return [...this.items.values()].filter((value) => matchesWhere(value, where)).length;
	}
}

class MemoryKv implements KVAccess {
	private values = new Map<string, unknown>();
	constructor(seed: Record<string, unknown> = {}) { for (const [key, value] of Object.entries(seed)) this.values.set(key, value); }
	async get<T>(key: string): Promise<T | null> { return (this.values.get(key) as T | undefined) ?? null; }
	async set(key: string, value: unknown): Promise<void> { this.values.set(key, value); }
	async delete(key: string): Promise<boolean> { return this.values.delete(key); }
	async list(prefix = ""): Promise<Array<{ key: string; value: unknown }>> {
		return [...this.values.entries()].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => ({ key, value }));
	}
}

export function createForm(overrides: Partial<FormDefinition> = {}): FormDefinition {
	return {
		name: "Contact us",
		slug: "contact-us",
		status: "active",
		submissionCount: 0,
		lastSubmissionAt: null,
		createdAt: "2026-04-01T00:00:00.000Z",
		updatedAt: "2026-04-01T00:00:00.000Z",
		pages: [{ fields: [
			{ id: "field-name", type: "text", label: "Name", name: "name", required: true },
			{ id: "field-email", type: "email", label: "Email", name: "email", required: true },
			{ id: "field-message", type: "textarea", label: "Message", name: "message", required: true },
		] }],
		settings: {
			confirmationMessage: "Thanks!",
			redirectUrl: undefined,
			notifyEmails: ["team@example.com"],
			submitLabel: "Send",
		},
		...overrides,
	};
}

export function createSubmission(overrides: Partial<Submission> = {}): Submission {
	return {
		formId: "form-1",
		data: { name: "Ada Lovelace", email: "ada@example.com", message: "Hello world" },
		status: "new",
		createdAt: "2026-04-02T00:00:00.000Z",
		meta: { userAgent: "Vitest", referer: "https://example.com/contact", country: "US" },
		...overrides,
	};
}

export function createPluginContext(options: {
	forms?: Array<{ id: string; data: FormDefinition }>;
	submissions?: Array<{ id: string; data: Submission }>;
	kv?: Record<string, unknown>;
	emailSend?: (message: { to: string; subject: string; text?: string; html?: string }) => Promise<void>;
}) {
	const formsCollection = new MemoryCollection<FormDefinition>(options.forms);
	const submissionsCollection = new MemoryCollection<Submission>(options.submissions);
	const kv = new MemoryKv(options.kv);
	const sent: Array<{ to: string; subject: string; text?: string; html?: string }> = [];

	const ctx = {
		storage: { forms: formsCollection, submissions: submissionsCollection },
		kv,
		email: {
			send: async (message: { to: string; subject: string; text?: string; html?: string }) => {
				sent.push(message);
				if (options.emailSend) await options.emailSend(message);
			},
		},
		log: createLogger(),
		site: { url: "https://example.com" },
		plugin: { id: "masonjames-contact-forms-core", version: "0.1.0" },
		cron: {
			schedule: async () => {},
			cancel: async () => {},
		},
	} as unknown as PluginContext;

	return { ctx, sentEmails: sent, formsCollection, submissionsCollection, kv };
}

export function createStandardRouteContext<TInput>(options: {
	input: TInput;
	forms?: Array<{ id: string; data: FormDefinition }>;
	submissions?: Array<{ id: string; data: Submission }>;
	kv?: Record<string, unknown>;
	requestUrl?: string;
	requestMeta?: Partial<RouteContext["requestMeta"]>;
	emailSend?: (message: { to: string; subject: string; text?: string; html?: string }) => Promise<void>;
}) {
	const base = createPluginContext(options);
	const routeCtx = {
		input: options.input,
		request: new Request(options.requestUrl ?? "https://example.com/_emdash/api/plugins/masonjames-contact-forms-core/test"),
		requestMeta: {
			ip: "203.0.113.10",
			userAgent: "Vitest",
			referer: "https://example.com/contact",
			geo: { country: "US" },
			...(options.requestMeta ?? {}),
		},
	};
	return { ...base, routeCtx };
}

function createLogger() {
	return { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as PluginContext["log"];
}

function matchesWhere(data: unknown, where: QueryWhere): boolean {
	if (typeof data !== "object" || data === null) return false;
	const record = data as Record<string, unknown>;
	for (const [field, value] of Object.entries(where)) {
		const current = record[field];
		if (value && typeof value === "object" && !Array.isArray(value)) {
			if ("gte" in value && compareValues(current, value.gte) < 0) return false;
			if ("gt" in value && compareValues(current, value.gt) <= 0) return false;
			if ("lte" in value && compareValues(current, value.lte) > 0) return false;
			if ("lt" in value && compareValues(current, value.lt) >= 0) return false;
			continue;
		}
		if (current !== value) return false;
	}
	return true;
}

function compareByOrder(a: unknown, b: unknown, orderEntries: Array<[string, "asc" | "desc"]>) {
	const left = toRecord(a);
	const right = toRecord(b);
	for (const [field, direction] of orderEntries) {
		const comparison = compareValues(left[field], right[field]);
		if (comparison === 0) continue;
		return direction === "desc" ? -comparison : comparison;
	}
	return 0;
}

function compareValues(a: unknown, b: unknown): number {
	const left = a == null ? "" : String(a);
	const right = b == null ? "" : String(b);
	return left.localeCompare(right);
}

function toRecord(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
