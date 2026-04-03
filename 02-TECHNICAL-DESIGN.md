# Technical Design: EmDash Contact Forms

# 1. Executive summary

This design builds a **production-ready trusted/native plugin** from the EmDash `packages/plugins/forms` baseline, but trims the feature set to the narrow Release A scope defined in the PRD.

The implementation deliberately uses the external-repo packaging pattern shown by `emdash-restrict-with-stripe`:

- thin descriptor in `src/index.ts`
- runtime plugin in `src/plugin.ts`
- React admin in `src/admin.tsx`
- Astro renderer in `src/astro/*`

# 2. Source-of-truth references

Use these sources in this order when implementation details conflict:

1. **Current core runtime behavior**
   - `emdash/packages/core/src/plugins/types.ts`
   - `emdash/packages/core/src/plugins/define-plugin.ts`
   - `emdash/packages/core/src/plugins/context.ts`
   - `emdash/packages/core/src/plugins/manifest-schema.ts`

2. **Current CLI and packaging behavior**
   - `emdash/packages/core/src/cli/commands/plugin-init.ts`
   - `emdash/packages/core/src/cli/commands/bundle.ts`
   - `emdash/packages/core/src/cli/commands/bundle-utils.ts`
   - `emdash/packages/core/src/cli/commands/plugin-validate.ts`
   - `emdash/packages/core/src/cli/commands/publish.ts`

3. **Closest implementation baseline**
   - `emdash/packages/plugins/forms/*`

4. **Standalone repo composition pattern**
   - `emdash-restrict-with-stripe/*`

5. **Docs**
   - `emdash/docs/src/content/docs/plugins/*`

If docs conflict with current runtime or bundling code, core source wins.

# 3. Architecture decision log

## DD-01: Release A is a native/trusted plugin

**Decision:** Build Release A with native/trusted plugin surfaces.

**Why:** The requested product needs React admin pages plus a Portable Text block and Astro site renderer. Those are native/trusted features. The marketplace bundle flow does not support them as-is.

**Impact:** Release A is installed through EmDash config, not the marketplace.

## DD-02: Keep the baseline `pages` storage shape, but enforce one page

**Decision:** Retain `FormDefinition.pages: FormPage[]` internally and require `pages.length === 1`.

**Why:** This preserves compatibility with the existing EmDash forms baseline and lowers migration risk while still shipping a single-page MVP.

**Impact:** Admin UI and schemas must prevent multi-page authoring.

## DD-03: Remove the public `definition` route

**Decision:** The only public write/read route in Release A is `submit`.

**Why:** The PRD calls for one tightly bounded public route. In a trusted/native install, the Astro component can render form definitions server-side without a second public endpoint.

**Impact:** `FormEmbed.astro` receives everything it needs at render time. Client code only handles progressive enhancement for submit.

## DD-04: Release A capability set is `email:send` only

**Decision:** The plugin requests only `email:send`.

**Why:** Release A excludes file uploads, webhooks, and CAPTCHA, so `write:media` and `network:fetch` are unnecessary.

**Impact:** Any code copied from the baseline that assumes `ctx.media` or `ctx.http` must be removed.

## DD-05: Privacy-first submission metadata

**Decision:** Submission records do not persist raw IP.

**Why:** Operators do not need long-term raw IP storage for the Release A product, and keeping it out of records reduces privacy risk.

**Impact:** Rate limiting may still use raw IP transiently in KV state. Stored metadata is limited to `country`, `referer`, and `userAgent`.

## DD-06: Rate limiting belongs in the plugin for Release A

**Decision:** Add small KV-based per-IP rate limiting.

**Why:** The plugin accepts anonymous input and needs a minimum operational abuse guard even before edge/WAF controls are configured.

**Impact:** Add a small `security.ts` helper and plugin settings for rate-limit thresholds.

## DD-07: React admin stays custom; plugin settings stay auto-generated

**Decision:** Use React pages for forms and submissions, but use `admin.settingsSchema` for plugin-level settings instead of a custom settings page.

**Why:** Forms and submissions need rich operator UI, but plugin-level settings are simple enough for auto-generated settings.

**Impact:** No extra custom settings route/page is needed in Release A.

## DD-08: Marketplace publication is a separate adaptation track

**Decision:** Keep all marketplace work in a separate, explicit track.

**Why:** React admin and Portable Text blocks are currently the main blockers to `emdash plugin bundle` / `emdash plugin publish`.

**Impact:** Release A completion does not imply marketplace readiness. Release B work is documented separately.

# 4. Target repository structure

```text
emdash-contact-forms/
├── src/
│   ├── index.ts
│   ├── plugin.ts
│   ├── admin.tsx
│   ├── types.ts
│   ├── schemas.ts
│   ├── storage.ts
│   ├── validation.ts
│   ├── format.ts
│   ├── security.ts
│   ├── handlers/
│   │   ├── forms.ts
│   │   ├── submit.ts
│   │   └── submissions.ts
│   ├── astro/
│   │   ├── FormEmbed.astro
│   │   └── index.ts
│   ├── client/
│   │   └── index.ts
│   └── styles/
│       └── forms.css
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── README.md
├── CHANGELOG.md
├── package.json
└── tsconfig.json
```

# 5. Descriptor/runtime shape

## Descriptor: `src/index.ts`

Responsibilities:

- export `contactFormsPlugin(options?)`
- declare plugin id, version, entrypoints, capabilities, storage
- declare admin page metadata
- declare widget metadata
- declare `componentsEntry`

Expected descriptor shape:

```ts
{
  id: "masonjames-contact-forms",
  version: "0.1.0",
  entrypoint: "@masonjames/emdash-contact-forms/plugin",
  adminEntry: "@masonjames/emdash-contact-forms/admin",
  componentsEntry: "@masonjames/emdash-contact-forms/astro",
  capabilities: ["email:send"],
  storage: {
    forms: { indexes: ["status", "createdAt"], uniqueIndexes: ["slug"] },
    submissions: { indexes: ["formId", "status", "createdAt"] }
  },
  adminPages: [
    { path: "/", label: "Forms", icon: "list" },
    { path: "/submissions", label: "Submissions", icon: "inbox" }
  ],
  adminWidgets: [
    { id: "recent-submissions", title: "Recent Submissions", size: "half" }
  ]
}
```

## Runtime: `src/plugin.ts`

Responsibilities:

- `createPlugin()` with `definePlugin({...})`
- actual route handlers
- actual storage config
- admin configuration
- periodic cleanup hook

Release A runtime must not include:

- `settings/turnstile-status`
- `definition`
- webhook logic
- autoresponder logic
- digest hooks
- file-upload logic
- `allowedHosts: ["*"]`

# 6. Data model

## `FormDefinition`

```ts
interface FormDefinition {
  name: string;
  slug: string;
  pages: [
    {
      title?: string;
      fields: FormField[];
    }
  ];
  settings: {
    confirmationMessage: string;
    redirectUrl?: string;
    notifyEmails: string[];
    submitLabel: string;
    retentionDays?: number;
  };
  status: "active" | "paused";
  submissionCount: number;
  lastSubmissionAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Notes

- The single-page tuple-like shape is conceptual. Actual implementation may still use `FormPage[]`, but validators must enforce one page.
- `retentionDays` may live on the form if preserving the baseline makes cleanup simpler. If omitted, fall back to plugin setting.

## `FormField`

Allowed types only:

- `text`
- `email`
- `textarea`
- `select`
- `checkbox`

Release A intentionally excludes file and multi-option group fields.

## `Submission`

```ts
interface Submission {
  formId: string;
  data: Record<string, unknown>;
  status: "new" | "read" | "archived";
  createdAt: string;
  meta: {
    userAgent: string | null;
    referer: string | null;
    country: string | null;
  };
}
```

### Notes

- Do not carry forward `files`, `starred`, or `notes` from the baseline unless they are added later intentionally.
- If preserving `read` status from the baseline, keep archive as an explicit action.

# 7. Route design

## Public route

### `submit`

Input:

- `formId`
- `data`

Behavior:

1. load form by id
2. reject paused form
3. run honeypot check
4. enforce KV-based rate limit
5. validate data against form field definitions
6. store submission
7. send notification email(s)
8. update form counters
9. return JSON success payload

Public response contract:

```json
{
  "success": true,
  "message": "Thank you for your submission.",
  "redirect": "https://example.com/thanks"
}
```

Failure responses must stay generic for abuse-related failures.

## Private routes

### `forms/list`
List forms for admin UI and block option selection.

### `forms/create`
Create new form after slug and field-name validation.

### `forms/update`
Update existing form, preserving counters.

### `forms/delete`
Delete form and optionally related submissions.

### `submissions/list`
List submissions for a form, newest first.

### `submissions/get`
Read one submission for detail view.

### `submissions/update`
Change status to `read` or `archived`, or restore to `new`.

### `submissions/delete`
Delete a submission.

### `submissions/export`
Export CSV for one form.

# 8. Validation model

## Create/update validation

- form name required
- slug unique
- exactly one page
- field names unique within the form
- allowed field types only
- `redirectUrl` restricted to `http` or `https`
- select fields require at least one option
- checkbox fields reject option arrays

## Submit validation

- required fields enforced
- email format checked for email fields
- select values must match allowed options
- required checkbox must evaluate truthy
- unexpected fields ignored or rejected consistently; choose one strategy and test it

Recommended Release A behavior: ignore unexpected fields during storage, but never trust them for email formatting or CSV export.

# 9. Security design

## Honeypot

Implementation details:

- hidden field injected by the Astro renderer
- value must be empty
- if filled, respond with a generic success payload and do not store a submission

This preserves signal quality without teaching bots.

## Rate limiting

Suggested KV key:

```text
state:rate-limit:{formId}:{ip}:{bucket}
```

Suggested stored value:

```json
{ "count": 3, "expiresAt": "2026-04-03T15:00:00.000Z" }
```

Behavior:

- increment per form + IP + time bucket
- block once `count > settings:rateLimitMaxPerHour`
- if IP is unavailable, skip plugin rate limiting and rely on honeypot + deployment guidance

## Email failure handling

- log failures
- never expose provider or internal error details to the visitor
- do not roll back the submission record if email fails

## Cleanup

- weekly cron task
- delete submissions older than resolved retention window
- update `submissionCount` after deletion

# 10. Frontend rendering design

## Astro component

`FormEmbed.astro` should:

- load the form server-side from plugin storage or passed block props
- render all fields directly into HTML
- include honeypot
- include hidden `formId`
- include status message container
- point submit action at `/_emdash/api/plugins/masonjames-contact-forms/submit`

## Client enhancement

`src/client/index.ts` should:

- intercept form submit
- submit via `fetch`
- render inline success/error state
- disable submit button during request
- preserve accessible live regions

Release A does not need a full no-JS fallback page flow.

# 11. Admin UX design

## Forms page

Needs:

- forms table
- create/edit flow
- single-page field editor
- pause/resume
- delete

Do not expose UI for:

- extra pages
- file fields
- conditional rules
- webhook settings
- autoresponder settings
- digest settings
- Turnstile

## Submissions page

Needs:

- form filter
- status filter
- submissions table
- detail drawer or panel
- archive/unarchive action
- delete action
- CSV export

# 12. Packaging and repository quality

Release A repo must include:

- README with install and configuration
- CHANGELOG
- MIT license if desired
- screenshots for GitHub README
- clean `package.json` exports
- `peerDependencies` on `emdash`, `react`, `astro`
- typecheck and test scripts

# 13. Open implementation unknowns to validate early

1. **Admin option loading for Portable Text block**
   - Validate that the chosen block field can source form options from `forms/list` the same way the baseline does.

2. **Auto-generated settings page coexistence with custom admin pages**
   - Validate the settings UI placement inside EmDash admin.

3. **Cron availability in the target runtime**
   - Validate cleanup scheduling in the standalone plugin repo using the same pattern as the baseline `forms` plugin.

4. **Submission delete + counter consistency**
   - Validate that counts remain correct under concurrent submit/delete operations by recomputing with `count()`.

These are not blockers to starting implementation, but they should be validated in the first integration pass.
