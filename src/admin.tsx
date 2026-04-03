import type { PluginAdminExports } from "emdash";
import { apiFetch as baseFetch, getErrorMessage, parseApiResponse } from "emdash/plugin-utils";
import * as React from "react";

import type {
	FieldType,
	FormDefinition,
	FormField,
	SubmissionDetail,
	SubmissionListItem,
	SubmissionStatus,
} from "./types.js";

const API = "/_emdash/api/plugins/masonjames-contact-forms";
const FIELD_TYPES: Array<{ value: FieldType; label: string }> = [
	{ value: "text", label: "Text" },
	{ value: "email", label: "Email" },
	{ value: "textarea", label: "Textarea" },
	{ value: "select", label: "Select" },
	{ value: "checkbox", label: "Checkbox" },
];

type FormRecord = FormDefinition & { id: string };

interface WidgetProps {
	id?: string;
}

const pageShell: React.CSSProperties = {
	display: "grid",
	gap: "1rem",
};

const cardStyle: React.CSSProperties = {
	background: "white",
	border: "1px solid #e5e7eb",
	borderRadius: "16px",
	padding: "1rem",
	boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const rowStyle: React.CSSProperties = {
	display: "flex",
	gap: "0.75rem",
	alignItems: "center",
	flexWrap: "wrap",
};

const buttonStyle: React.CSSProperties = {
	border: "1px solid #d1d5db",
	background: "white",
	borderRadius: "999px",
	padding: "0.55rem 0.9rem",
	font: "inherit",
	cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
	...buttonStyle,
	background: "#111827",
	color: "white",
	borderColor: "#111827",
};

const destructiveButtonStyle: React.CSSProperties = {
	...buttonStyle,
	color: "#b91c1c",
	borderColor: "#fecaca",
	background: "#fff5f5",
};

const inputStyle: React.CSSProperties = {
	width: "100%",
	border: "1px solid #d1d5db",
	borderRadius: "12px",
	padding: "0.7rem 0.85rem",
	font: "inherit",
};

const labelStyle: React.CSSProperties = {
	fontWeight: 600,
	display: "grid",
	gap: "0.4rem",
};

async function apiFetch(route: string, body?: unknown, method = "POST"): Promise<Response> {
	return baseFetch(`${API}/${route}`, {
		method,
		headers: body === undefined ? undefined : { "Content-Type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

async function apiData<T>(route: string, body?: unknown, method = "POST"): Promise<T> {
	const response = await apiFetch(route, body, method);
	if (!response.ok) {
		throw new Error(await getErrorMessage(response, "Plugin request failed"));
	}
	return parseApiResponse<T>(response, "Plugin request failed");
}

function autoSlugify(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

function autoFieldName(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.replace(/^(\d)/, "_$1");
}

function formatDateTime(iso: string | null): string {
	if (!iso) return "—";
	return new Date(iso).toLocaleString();
}

function StatusBadge({ status }: { status: string }) {
	const styles: Record<string, React.CSSProperties> = {
		active: { background: "#ecfdf5", color: "#047857" },
		paused: { background: "#fff7ed", color: "#c2410c" },
		new: { background: "#eff6ff", color: "#1d4ed8" },
		read: { background: "#f3f4f6", color: "#374151" },
		archived: { background: "#f5f3ff", color: "#6d28d9" },
	};

	return (
		<span
			style={{
				padding: "0.2rem 0.55rem",
				borderRadius: "999px",
				fontSize: "0.82rem",
				fontWeight: 700,
				textTransform: "capitalize",
				...(styles[status] ?? styles.read),
			}}
		>
			{status}
		</span>
	);
}

function EmptyState({
	title,
	description,
	action,
}: {
	title: string;
	description: string;
	action?: React.ReactNode;
}) {
	return (
		<div style={{ ...cardStyle, textAlign: "center", paddingBlock: "2.5rem" }}>
			<h3 style={{ margin: 0 }}>{title}</h3>
			<p style={{ color: "#6b7280", marginBottom: "1rem" }}>{description}</p>
			{action}
		</div>
	);
}

function FormsPage() {
	const [forms, setForms] = React.useState<FormRecord[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [editingForm, setEditingForm] = React.useState<FormRecord | null>(null);
	const [creating, setCreating] = React.useState(false);

	const loadForms = React.useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await apiData<{ items: FormRecord[] }>("forms/list", {});
			setForms(data.items);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load forms");
		} finally {
			setLoading(false);
		}
	}, []);

	React.useEffect(() => {
		void loadForms();
	}, [loadForms]);

	if (creating || editingForm) {
		return (
			<FormEditor
				form={editingForm}
				onCancel={() => {
					setCreating(false);
					setEditingForm(null);
				}}
				onSaved={async () => {
					setCreating(false);
					setEditingForm(null);
					await loadForms();
				}}
			/>
		);
	}

	return (
		<div style={pageShell}>
			<div style={{ ...rowStyle, justifyContent: "space-between" }}>
				<div>
					<h2 style={{ margin: 0 }}>Contact Forms</h2>
					<p style={{ margin: "0.35rem 0 0", color: "#6b7280" }}>
						Create simple, production-ready contact forms for EmDash content.
					</p>
				</div>
				<button style={primaryButtonStyle} onClick={() => setCreating(true)}>
					New form
				</button>
			</div>

			{error && <div style={{ ...cardStyle, color: "#b91c1c" }}>{error}</div>}

			{loading ? (
				<div style={cardStyle}>Loading forms…</div>
			) : forms.length === 0 ? (
				<EmptyState
					title="No forms yet"
					description="Create your first contact form and embed it in a Portable Text field."
					action={
						<button style={primaryButtonStyle} onClick={() => setCreating(true)}>
							Create a form
						</button>
					}
				/>
			) : (
				<div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
					{forms.map((form) => (
						<div
							key={form.id}
							style={{
								padding: "1rem",
								display: "grid",
								gap: "0.75rem",
								borderTop: "1px solid #f3f4f6",
							}}
						>
							<div style={{ ...rowStyle, justifyContent: "space-between" }}>
								<div>
									<div style={{ ...rowStyle, gap: "0.5rem" }}>
										<strong>{form.name}</strong>
										<StatusBadge status={form.status} />
									</div>
									<div style={{ color: "#6b7280", fontSize: "0.92rem", marginTop: "0.25rem" }}>
										Slug: <code>{form.slug}</code> · {form.submissionCount} submissions · Last submit{" "}
										{formatDateTime(form.lastSubmissionAt)}
									</div>
								</div>
								<div style={rowStyle}>
									<button style={buttonStyle} onClick={() => setEditingForm(form)}>
										Edit
									</button>
									<button
										style={buttonStyle}
										onClick={async () => {
											await apiData("forms/update", {
												id: form.id,
												status: form.status === "active" ? "paused" : "active",
											});
											await loadForms();
										}}
									>
										{form.status === "active" ? "Pause" : "Activate"}
									</button>
									<button
										style={destructiveButtonStyle}
										onClick={async () => {
											if (!confirm(`Delete "${form.name}" and all related submissions?`)) return;
											await apiData("forms/delete", { id: form.id });
											await loadForms();
										}}
									>
										Delete
									</button>
								</div>
							</div>

							<div style={{ color: "#6b7280", fontSize: "0.92rem" }}>
								Block type: <code>Contact Form</code> · Select this form in the block picker to embed it.
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function FormEditor({
	form,
	onCancel,
	onSaved,
}: {
	form: FormRecord | null;
	onCancel: () => void;
	onSaved: () => void | Promise<void>;
}) {
	const [draft, setDraft] = React.useState<FormRecord>(() =>
		form ?? createEmptyForm(),
	);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const page = draft.pages[0];

	async function save() {
		setSaving(true);
		setError(null);
		try {
			const payload = {
				name: draft.name,
				slug: draft.slug,
				pages: draft.pages,
				settings: draft.settings,
				...(form ? { id: form.id, status: draft.status } : {}),
			};

			if (form) {
				await apiData("forms/update", payload);
			} else {
				await apiData("forms/create", payload);
			}

			await onSaved();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save form");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div style={pageShell}>
			<div style={{ ...rowStyle, justifyContent: "space-between" }}>
				<div>
					<h2 style={{ margin: 0 }}>{form ? "Edit form" : "Create form"}</h2>
					<p style={{ margin: "0.35rem 0 0", color: "#6b7280" }}>
						Release A supports a single-page contact form with five field types.
					</p>
				</div>
				<div style={rowStyle}>
					<button style={buttonStyle} onClick={onCancel}>
						Cancel
					</button>
					<button style={primaryButtonStyle} disabled={saving} onClick={save}>
						{saving ? "Saving…" : "Save form"}
					</button>
				</div>
			</div>

			{error && <div style={{ ...cardStyle, color: "#b91c1c" }}>{error}</div>}

			<div style={{ ...cardStyle, display: "grid", gap: "1rem" }}>
				<div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
					<label style={labelStyle}>
						Form name
						<input
							style={inputStyle}
							value={draft.name}
							onChange={(event) =>
								setDraft((current) => ({
									...current,
									name: event.target.value,
									slug:
										current.slug === autoSlugify(current.name)
											? autoSlugify(event.target.value)
											: current.slug,
								}))
							}
						/>
					</label>
					<label style={labelStyle}>
						Slug
						<input
							style={inputStyle}
							value={draft.slug}
							onChange={(event) =>
								setDraft((current) => ({ ...current, slug: autoSlugify(event.target.value) }))
							}
						/>
					</label>
				</div>

				<label style={labelStyle}>
					Confirmation message
					<textarea
						style={{ ...inputStyle, minHeight: "5rem" }}
						value={draft.settings.confirmationMessage}
						onChange={(event) =>
							setDraft((current) => ({
								...current,
								settings: {
									...current.settings,
									confirmationMessage: event.target.value,
								},
							}))
						}
					/>
				</label>

				<div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
					<label style={labelStyle}>
						Redirect URL
						<input
							style={inputStyle}
							value={draft.settings.redirectUrl ?? ""}
							onChange={(event) =>
								setDraft((current) => ({
									...current,
									settings: {
										...current.settings,
										redirectUrl: event.target.value,
									},
								}))
							}
						/>
					</label>
					<label style={labelStyle}>
						Submit button label
						<input
							style={inputStyle}
							value={draft.settings.submitLabel}
							onChange={(event) =>
								setDraft((current) => ({
									...current,
									settings: {
										...current.settings,
										submitLabel: event.target.value,
									},
								}))
							}
						/>
					</label>
				</div>

				<label style={labelStyle}>
					Notification emails
					<input
						style={inputStyle}
						placeholder="hello@example.com, ops@example.com"
						value={draft.settings.notifyEmails.join(", ")}
						onChange={(event) =>
							setDraft((current) => ({
								...current,
								settings: {
									...current.settings,
									notifyEmails: event.target.value
										.split(",")
										.map((value) => value.trim())
										.filter(Boolean),
								},
							}))
						}
					/>
				</label>
			</div>

			<div style={{ ...cardStyle, display: "grid", gap: "1rem" }}>
				<div style={{ ...rowStyle, justifyContent: "space-between" }}>
					<div>
						<h3 style={{ margin: 0 }}>Fields</h3>
						<p style={{ margin: "0.35rem 0 0", color: "#6b7280" }}>
							Only the Release A field set is exposed here.
						</p>
					</div>
					<button
						style={buttonStyle}
						onClick={() =>
							setDraft((current) => ({
								...current,
								pages: [
									{
										...current.pages[0],
										fields: [...current.pages[0].fields, createField()],
									},
								],
							}))
						}
					>
						Add field
					</button>
				</div>

				<div style={{ display: "grid", gap: "0.85rem" }}>
					{page.fields.map((field, index) => (
						<FieldEditor
							key={field.id}
							field={field}
							index={index}
							total={page.fields.length}
							onChange={(updates) =>
								setDraft((current) => ({
									...current,
									pages: [
										{
											...current.pages[0],
											fields: current.pages[0].fields.map((item) =>
												item.id === field.id ? { ...item, ...updates } : item,
											),
										},
									],
								}))
							}
							onMove={(direction) =>
								setDraft((current) => ({
									...current,
									pages: [
										{
											...current.pages[0],
											fields: moveItem(current.pages[0].fields, index, direction),
										},
									],
								}))
							}
							onRemove={() =>
								setDraft((current) => ({
									...current,
									pages: [
										{
											...current.pages[0],
											fields: current.pages[0].fields.filter((item) => item.id !== field.id),
										},
									],
								}))
							}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

function FieldEditor({
	field,
	index,
	total,
	onChange,
	onMove,
	onRemove,
}: {
	field: FormField;
	index: number;
	total: number;
	onChange: (updates: Partial<FormField>) => void;
	onMove: (direction: -1 | 1) => void;
	onRemove: () => void;
}) {
	return (
		<div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "1rem", display: "grid", gap: "0.85rem" }}>
			<div style={{ ...rowStyle, justifyContent: "space-between" }}>
				<strong>{field.label || `Field ${index + 1}`}</strong>
				<div style={rowStyle}>
					<button style={buttonStyle} disabled={index === 0} onClick={() => onMove(-1)}>
						↑
					</button>
					<button style={buttonStyle} disabled={index === total - 1} onClick={() => onMove(1)}>
						↓
					</button>
					<button style={destructiveButtonStyle} onClick={onRemove}>
						Remove
					</button>
				</div>
			</div>

			<div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr 1fr" }}>
				<label style={labelStyle}>
					Label
					<input
						style={inputStyle}
						value={field.label}
						onChange={(event) =>
							onChange({
								label: event.target.value,
								name: field.name === autoFieldName(field.label) ? autoFieldName(event.target.value) : field.name,
							})
						}
					/>
				</label>
				<label style={labelStyle}>
					Machine name
					<input
						style={inputStyle}
						value={field.name}
						onChange={(event) => onChange({ name: autoFieldName(event.target.value) })}
					/>
				</label>
				<label style={labelStyle}>
					Type
					<select
						style={inputStyle}
						value={field.type}
						onChange={(event) =>
							onChange({
								type: event.target.value as FieldType,
								options: event.target.value === "select" ? field.options ?? [{ label: "Option", value: "option" }] : undefined,
							})
						}
					>
						{FIELD_TYPES.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</label>
			</div>

			<div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
				<label style={labelStyle}>
					Placeholder
					<input
						style={inputStyle}
						value={field.placeholder ?? ""}
						onChange={(event) => onChange({ placeholder: event.target.value })}
					/>
				</label>
				<label style={labelStyle}>
					Help text
					<input
						style={inputStyle}
						value={field.helpText ?? ""}
						onChange={(event) => onChange({ helpText: event.target.value })}
					/>
				</label>
			</div>

			<label style={{ ...rowStyle, fontWeight: 600 }}>
				<input
					type="checkbox"
					checked={field.required}
					onChange={(event) => onChange({ required: event.target.checked })}
				/>
				Required field
			</label>

			{field.type === "select" ? (
				<SelectOptionsEditor
					options={field.options ?? []}
					onChange={(options) => onChange({ options })}
				/>
			) : null}
		</div>
	);
}

function SelectOptionsEditor({
	options,
	onChange,
}: {
	options: Array<{ label: string; value: string }>;
	onChange: (options: Array<{ label: string; value: string }>) => void;
}) {
	return (
		<div style={{ display: "grid", gap: "0.75rem" }}>
			<div style={{ ...rowStyle, justifyContent: "space-between" }}>
				<strong>Select options</strong>
				<button
					style={buttonStyle}
					onClick={() => onChange([...options, { label: "Option", value: `option_${options.length + 1}` }])}
				>
					Add option
				</button>
			</div>
			{options.map((option, index) => (
				<div key={`${option.value}-${index}`} style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "1fr 1fr auto" }}>
					<input
						style={inputStyle}
						value={option.label}
						onChange={(event) =>
							onChange(
								options.map((item, itemIndex) =>
									itemIndex === index ? { ...item, label: event.target.value } : item,
								),
							)
						}
					/>
					<input
						style={inputStyle}
						value={option.value}
						onChange={(event) =>
							onChange(
								options.map((item, itemIndex) =>
									itemIndex === index ? { ...item, value: autoFieldName(event.target.value) } : item,
								),
							)
						}
					/>
					<button
						style={destructiveButtonStyle}
						onClick={() => onChange(options.filter((_, itemIndex) => itemIndex !== index))}
					>
						Remove
					</button>
				</div>
			))}
		</div>
	);
}

function SubmissionsPage() {
	const [forms, setForms] = React.useState<FormRecord[]>([]);
	const [items, setItems] = React.useState<SubmissionListItem[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [selectedId, setSelectedId] = React.useState<string | null>(null);
	const [selected, setSelected] = React.useState<SubmissionDetail | null>(null);
	const [formId, setFormId] = React.useState("");
	const [status, setStatus] = React.useState<"" | SubmissionStatus>("");

	const loadForms = React.useCallback(async () => {
		const data = await apiData<{ items: FormRecord[] }>("forms/list", {});
		setForms(data.items);
	}, []);

	const loadSubmissions = React.useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await apiData<{ items: SubmissionListItem[] }>("submissions/list", {
				formId: formId || undefined,
				status: status || undefined,
				limit: 50,
			});
			setItems(data.items);
			if (selectedId && !data.items.some((item) => item.id === selectedId)) {
				setSelectedId(null);
				setSelected(null);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load submissions");
		} finally {
			setLoading(false);
		}
	}, [formId, status, selectedId]);

	React.useEffect(() => {
		void loadForms();
	}, [loadForms]);

	React.useEffect(() => {
		void loadSubmissions();
	}, [loadSubmissions]);

	async function loadDetail(id: string) {
		setSelectedId(id);
		const detail = await apiData<SubmissionDetail>("submissions/get", { id });
		setSelected(detail);
	}

	async function updateStatus(id: string, nextStatus: SubmissionStatus) {
		await apiData("submissions/update", { id, status: nextStatus });
		if (selectedId === id) {
			await loadDetail(id);
		}
		await loadSubmissions();
	}

	async function removeSubmission(id: string) {
		if (!confirm("Delete this submission?")) return;
		await apiData("submissions/delete", { id });
		if (selectedId === id) {
			setSelectedId(null);
			setSelected(null);
		}
		await loadSubmissions();
	}

	async function exportCsv() {
		if (!formId) {
			alert("Choose a form before exporting CSV.");
			return;
		}

		const result = await apiData<{
			data: string;
			filename: string;
			contentType: string;
		}>("submissions/export", {
			formId,
			status: status || undefined,
		});

		const blob = new Blob([result.data], { type: result.contentType });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = result.filename;
		link.click();
		URL.revokeObjectURL(url);
	}

	return (
		<div style={pageShell}>
			<div style={{ ...rowStyle, justifyContent: "space-between" }}>
				<div>
					<h2 style={{ margin: 0 }}>Submissions</h2>
					<p style={{ margin: "0.35rem 0 0", color: "#6b7280" }}>
						Review, triage, archive, and export contact form submissions.
					</p>
				</div>
				<button style={buttonStyle} onClick={() => void exportCsv()}>
					Export CSV
				</button>
			</div>

			<div style={{ ...cardStyle, ...rowStyle }}>
				<label style={{ ...labelStyle, flex: 1 }}>
					Form
					<select style={inputStyle} value={formId} onChange={(event) => setFormId(event.target.value)}>
						<option value="">All forms</option>
						{forms.map((form) => (
							<option key={form.id} value={form.id}>
								{form.name}
							</option>
						))}
					</select>
				</label>
				<label style={{ ...labelStyle, width: "16rem" }}>
					Status
					<select style={inputStyle} value={status} onChange={(event) => setStatus(event.target.value as "" | SubmissionStatus)}>
						<option value="">All statuses</option>
						<option value="new">New</option>
						<option value="read">Read</option>
						<option value="archived">Archived</option>
					</select>
				</label>
			</div>

			{error && <div style={{ ...cardStyle, color: "#b91c1c" }}>{error}</div>}

			<div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "1rem" }}>
				<div style={cardStyle}>
					{loading ? (
						<div>Loading submissions…</div>
					) : items.length === 0 ? (
						<p style={{ margin: 0, color: "#6b7280" }}>No submissions match the current filters.</p>
					) : (
						<div style={{ display: "grid", gap: "0.65rem" }}>
							{items.map((item) => (
								<button
									key={item.id}
									style={{
										textAlign: "left",
										border: item.id === selectedId ? "1px solid #111827" : "1px solid #e5e7eb",
										borderRadius: "14px",
										padding: "0.9rem",
										background: "white",
										cursor: "pointer",
										display: "grid",
										gap: "0.35rem",
									}}
									onClick={() => void loadDetail(item.id)}
								>
									<div style={{ ...rowStyle, justifyContent: "space-between" }}>
										<strong>{item.formName}</strong>
										<StatusBadge status={item.status} />
									</div>
									<div style={{ color: "#374151" }}>{item.preview}</div>
									<div style={{ color: "#6b7280", fontSize: "0.92rem" }}>
										{formatDateTime(item.createdAt)} · {item.meta.country ?? "Unknown country"}
									</div>
								</button>
							))}
						</div>
					)}
				</div>

				<div style={cardStyle}>
					{selected ? (
						<div style={{ display: "grid", gap: "1rem" }}>
							<div>
								<div style={{ ...rowStyle, justifyContent: "space-between" }}>
									<strong>{selected.formName}</strong>
									<StatusBadge status={selected.status} />
								</div>
								<p style={{ color: "#6b7280", marginBottom: 0 }}>{formatDateTime(selected.createdAt)}</p>
							</div>

							<div style={rowStyle}>
								{selected.status !== "read" && (
									<button style={buttonStyle} onClick={() => void updateStatus(selected.id, "read")}>
										Mark read
									</button>
								)}
								{selected.status !== "archived" ? (
									<button style={buttonStyle} onClick={() => void updateStatus(selected.id, "archived")}>
										Archive
									</button>
								) : (
									<button style={buttonStyle} onClick={() => void updateStatus(selected.id, "read")}>
										Unarchive
									</button>
								)}
								<button style={destructiveButtonStyle} onClick={() => void removeSubmission(selected.id)}>
									Delete
								</button>
							</div>

							<div style={{ display: "grid", gap: "0.75rem" }}>
								{Object.entries(selected.data).map(([key, value]) => (
									<div key={key} style={{ borderTop: "1px solid #f3f4f6", paddingTop: "0.75rem" }}>
										<div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{key}</div>
										<div style={{ color: "#374151", whiteSpace: "pre-wrap" }}>{String(value)}</div>
									</div>
								))}
							</div>

							<div style={{ color: "#6b7280", fontSize: "0.92rem" }}>
								<div>User agent: {selected.meta.userAgent ?? "—"}</div>
								<div>Referer: {selected.meta.referer ?? "—"}</div>
								<div>Country: {selected.meta.country ?? "—"}</div>
							</div>
						</div>
					) : (
						<p style={{ margin: 0, color: "#6b7280" }}>Select a submission to inspect it.</p>
					)}
				</div>
			</div>
		</div>
	);
}

function RecentSubmissionsWidget(_props: WidgetProps) {
	const [items, setItems] = React.useState<SubmissionListItem[]>([]);
	const [loading, setLoading] = React.useState(true);

	React.useEffect(() => {
		void (async () => {
			try {
				const data = await apiData<{ items: SubmissionListItem[] }>("submissions/list", { limit: 5 });
				setItems(data.items);
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	if (loading) {
		return <div style={cardStyle}>Loading recent submissions…</div>;
	}

	return (
		<div style={{ ...cardStyle, display: "grid", gap: "0.75rem" }}>
			<strong>Recent submissions</strong>
			{items.length === 0 ? (
				<div style={{ color: "#6b7280" }}>No submissions yet.</div>
			) : (
				items.map((item) => (
					<div key={item.id} style={{ borderTop: "1px solid #f3f4f6", paddingTop: "0.75rem" }}>
						<div style={{ ...rowStyle, justifyContent: "space-between" }}>
							<span>{item.formName}</span>
							<StatusBadge status={item.status} />
						</div>
						<div style={{ color: "#6b7280", fontSize: "0.92rem" }}>{item.preview}</div>
					</div>
				))
			)}
		</div>
	);
}

function createEmptyForm(): FormRecord {
	return {
		id: "",
		name: "",
		slug: "",
		status: "active",
		submissionCount: 0,
		lastSubmissionAt: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		pages: [
			{
				fields: [createField()],
			},
		],
		settings: {
			confirmationMessage: "Thank you for your submission.",
			redirectUrl: "",
			notifyEmails: [],
			submitLabel: "Submit",
		},
	};
}

function createField(): FormField {
	return {
		id: crypto.randomUUID(),
		type: "text",
		label: "New field",
		name: "new_field",
		placeholder: "",
		helpText: "",
		required: false,
	};
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
	const nextIndex = index + direction;
	if (nextIndex < 0 || nextIndex >= items.length) return items;
	const next = [...items];
	const [item] = next.splice(index, 1);
	next.splice(nextIndex, 0, item);
	return next;
}

export const pages: PluginAdminExports["pages"] = {
	"/": FormsPage,
	"/submissions": SubmissionsPage,
};

export const widgets: PluginAdminExports["widgets"] = {
	"recent-submissions": RecentSubmissionsWidget,
};
