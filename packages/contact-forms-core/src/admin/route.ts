import type { PluginContext } from "emdash";

import { getSubmission, listSubmissions } from "../services/submissions.js";
import { listForms } from "../services/forms.js";
import { actions, button, context, divider, fields, form, header, numberInput, section, select, textInput } from "./blocks.js";
import { ADMIN_ACTIONS, type AdminInteraction, type AdminPage, type AdminResponse, type Block } from "./types.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function handleAdminRoute(
	routeCtx: { input: unknown; request: Request },
	ctx: PluginContext,
): Promise<AdminResponse> {
	try {
		const interaction = normalizeInteraction(routeCtx.input);
		if (!interaction) {
			return unsupported("Unsupported admin interaction payload.");
		}

		if (interaction.type === "page_load") {
			return renderPage(ctx, interaction.page);
		}

		if (interaction.type === "block_action" && interaction.action_id === ADMIN_ACTIONS.submissionsView) {
			return buildSubmissionsPage(ctx, { selectedId: getString(interaction.value) });
		}

		if (interaction.type === "form_submit") {
			if (interaction.action_id === ADMIN_ACTIONS.settingsSave) {
				return saveSettings(ctx, interaction.values);
			}
			if (interaction.action_id === ADMIN_ACTIONS.submissionsFilter) {
				return buildSubmissionsPage(ctx, {
					formId: getString(interaction.values.formId),
					status: getString(interaction.values.status),
				});
			}
		}

		return unsupported("This Block Kit action is reserved for a later Release B slice.");
	} catch (error) {
		ctx.log.error("Contact forms core admin route failed", {
			error: error instanceof Error ? error.message : String(error),
		});
		return {
			blocks: [header("Contact Forms Core"), context("Failed to load admin response.")],
			toast: { message: "Failed to load contact forms admin", type: "error" },
		};
	}
}

async function renderPage(ctx: PluginContext, page: AdminPage): Promise<AdminResponse> {
	if (page === "/") return buildFormsPage(ctx);
	if (page === "/submissions") return buildSubmissionsPage(ctx, {});
	if (page === "/settings") return buildSettingsPage(ctx);
	if (page === "widget:recent-submissions") return buildRecentSubmissionsWidget(ctx);
	return unsupported(`Unknown admin page: ${page}`);
}

async function buildFormsPage(ctx: PluginContext): Promise<AdminResponse> {
	const result = await listForms(ctx, { limit: 50 });
	const blocks: Block[] = [
		header("Forms"),
		context("Marketplace Block Kit scaffold for the contact-forms core package."),
		context("Full form authoring stays deferred to a later Release B slice; existing backend logic is now packaged for sandbox compatibility."),
		divider(),
	];

	if (result.items.length === 0) {
		blocks.push(context("No forms exist for this marketplace-core installation yet."));
		return { blocks };
	}

	for (const item of result.items) {
		blocks.push(
			section(item.data.name),
			fields([
				{ label: "Slug", value: item.data.slug },
				{ label: "Status", value: item.data.status },
				{ label: "Submissions", value: String(item.data.submissionCount) },
				{ label: "Last submission", value: item.data.lastSubmissionAt ?? "—" },
			]),
		);
	}

	return { blocks };
}

async function buildSubmissionsPage(
	ctx: PluginContext,
	options: { formId?: string; status?: string; selectedId?: string },
): Promise<AdminResponse> {
	const [formsResult, submissionsResult] = await Promise.all([
		listForms(ctx, { limit: 100 }),
		listSubmissions(ctx, {
			formId: options.formId,
			status: normalizeSubmissionStatus(options.status),
			limit: 20,
		}),
	]);

	const blocks: Block[] = [
		header("Submissions"),
		context("Use this marketplace-core page to triage recent submissions and verify backend state."),
		form({
			blockId: "submissions-filter",
			fields: [
				select("formId", "Form", [{ label: "All forms", value: "" }, ...formsResult.items.map((item) => ({ label: item.data.name, value: item.id }))], {
					initialValue: options.formId ?? "",
				}),
				select("status", "Status", [
					{ label: "Any", value: "" },
					{ label: "New", value: "new" },
					{ label: "Read", value: "read" },
					{ label: "Archived", value: "archived" },
				], {
					initialValue: options.status ?? "",
				}),
			],
			submit: { label: "Apply filters", actionId: ADMIN_ACTIONS.submissionsFilter },
		}),
		divider(),
	];

	if (submissionsResult.items.length === 0) {
		blocks.push(context("No submissions matched the current filters."));
		return { blocks };
	}

	for (const item of submissionsResult.items) {
		blocks.push(
			section(`${item.formName} — ${item.preview}`),
			fields([
				{ label: "Status", value: item.status },
				{ label: "Submitted", value: item.createdAt },
				{ label: "Country", value: item.meta.country ?? "—" },
			]),
			actions([button(ADMIN_ACTIONS.submissionsView, "View details", { value: item.id })]),
		);
	}

	if (options.selectedId) {
		const detail = await getSubmission(ctx, options.selectedId).catch(() => null);
		if (detail) {
			blocks.push(
				divider(),
				header("Submission detail"),
				section(`${detail.formName} — ${detail.id}`),
				fields(Object.entries(detail.data).map(([label, value]) => ({ label, value: String(value) }))),
				section("Request metadata"),
				fields([
					{ label: "User agent", value: detail.meta.userAgent ?? "—" },
					{ label: "Referer", value: detail.meta.referer ?? "—" },
					{ label: "Country", value: detail.meta.country ?? "—" },
				]),
			);
		}
	}

	return { blocks };
}

async function buildSettingsPage(ctx: PluginContext, toast?: AdminResponse["toast"]): Promise<AdminResponse> {
	const settings = await loadSettings(ctx);
	return {
		blocks: [
			header("Settings"),
			context("Marketplace-core settings replace the native admin.settingsSchema path."),
			form({
				blockId: "settings",
				fields: [
					textInput("defaultNotificationEmail", "Default notification email", {
						initialValue: settings.defaultNotificationEmail,
						placeholder: "ops@example.com",
					}),
					numberInput("retentionDays", "Retention days", { initialValue: settings.retentionDays, min: 0 }),
					numberInput("rateLimitMaxPerHour", "Rate limit max per hour", {
						initialValue: settings.rateLimitMaxPerHour,
						min: 1,
					}),
					numberInput("rateLimitWindowSeconds", "Rate limit window seconds", {
						initialValue: settings.rateLimitWindowSeconds,
						min: 60,
					}),
				],
				submit: { label: "Save", actionId: ADMIN_ACTIONS.settingsSave },
			}),
		],
		...(toast ? { toast } : {}),
	};
}

async function buildRecentSubmissionsWidget(ctx: PluginContext): Promise<AdminResponse> {
	const result = await listSubmissions(ctx, { limit: 4 });
	if (result.items.length === 0) {
		return { blocks: [context("No recent submissions yet.")] };
	}
	return {
		blocks: result.items.flatMap((item) => [
			section(`${item.formName} — ${item.preview}`),
			fields([
				{ label: "Status", value: item.status },
				{ label: "Submitted", value: item.createdAt },
			]),
		]),
	};
}

async function saveSettings(ctx: PluginContext, values: Record<string, unknown>): Promise<AdminResponse> {
	const email = getString(values.defaultNotificationEmail) ?? "";
	if (email && !EMAIL_RE.test(email)) {
		return buildSettingsPage(ctx, { message: "Default notification email must be valid.", type: "error" });
	}

	const retentionDays = clampWholeNumber(values.retentionDays, 0);
	const rateLimitMaxPerHour = clampWholeNumber(values.rateLimitMaxPerHour, 1);
	const rateLimitWindowSeconds = clampWholeNumber(values.rateLimitWindowSeconds, 60);

	await ctx.kv.set("settings:defaultNotificationEmail", email);
	await ctx.kv.set("settings:retentionDays", retentionDays);
	await ctx.kv.set("settings:rateLimitMaxPerHour", rateLimitMaxPerHour);
	await ctx.kv.set("settings:rateLimitWindowSeconds", rateLimitWindowSeconds);

	return buildSettingsPage(ctx, { message: "Settings saved.", type: "success" });
}

async function loadSettings(ctx: PluginContext) {
	return {
		defaultNotificationEmail: (await ctx.kv.get<string>("settings:defaultNotificationEmail")) ?? "",
		retentionDays: (await ctx.kv.get<number>("settings:retentionDays")) ?? 0,
		rateLimitMaxPerHour: (await ctx.kv.get<number>("settings:rateLimitMaxPerHour")) ?? 5,
		rateLimitWindowSeconds: (await ctx.kv.get<number>("settings:rateLimitWindowSeconds")) ?? 3600,
	};
}

function normalizeInteraction(value: unknown): AdminInteraction | null {
	if (!value || typeof value !== "object") return null;
	const input = value as Record<string, unknown>;
	const type = getString(input.type);
	if (!type) return null;
	if (type === "page_load") {
		const page = getString(input.page) as AdminPage | undefined;
		return page ? { type, page } : null;
	}
	if (type === "block_action") {
		const action_id = getString(input.action_id);
		if (!action_id) return null;
		return { type, action_id, value: input.value, page: getString(input.page) as AdminPage | undefined };
	}
	if (type === "form_submit") {
		const action_id = getString(input.action_id);
		const values = input.values;
		if (!action_id || !values || typeof values !== "object" || Array.isArray(values)) return null;
		return { type, action_id, values: values as Record<string, unknown>, page: getString(input.page) as AdminPage | undefined };
	}
	return null;
}

function unsupported(message: string): AdminResponse {
	return {
		blocks: [header("Contact Forms Core"), context(message)],
		toast: { message, type: "info" },
	};
}

function getString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeSubmissionStatus(value?: string): "new" | "read" | "archived" | undefined {
	return value === "new" || value === "read" || value === "archived" ? value : undefined;
}

function clampWholeNumber(value: unknown, minimum: number): number {
	const numberValue = typeof value === "number" ? value : Number(getString(value) ?? NaN);
	if (!Number.isFinite(numberValue)) return minimum;
	return Math.max(minimum, Math.floor(numberValue));
}
