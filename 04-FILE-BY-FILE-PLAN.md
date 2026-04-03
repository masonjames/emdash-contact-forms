# File-by-File Plan

This file is the concrete edit map for Codex.

Each entry includes:

- **What changes**
- **Why**
- **Dependencies**

Decision references point back to `02-TECHNICAL-DESIGN.md`.

# 1. New repository root files

## `package.json`

**What changes**

- create standalone package metadata
- set `"name": "@masonjames/emdash-contact-forms"`
- add exports:
  - `.`
  - `./plugin`
  - `./admin`
  - `./astro`
  - `./client`
- add scripts for typecheck, test, build
- declare peer deps: `emdash`, `react`, `astro`

**Why**

- external-style packaging should mirror `emdash-restrict-with-stripe`, not the monorepo-local `packages/plugins/forms/package.json`

**Dependencies**

- none

## `tsconfig.json`

**What changes**

- create standalone TS config
- support `src` outDir
- support JSX for `admin.tsx`

**Why**

- the standalone repo needs its own compile contract

**Dependencies**

- none

## `README.md`

**What changes**

- installation instructions
- config snippet using `contactFormsPlugin()`
- feature list restricted to Release A
- screenshots or placeholders
- security/deployment notes

**Why**

- GitHub/npm readiness

**Dependencies**

- complete after runtime and UI are stable

## `CHANGELOG.md`

**What changes**

- add `0.1.0` entry

**Why**

- release hygiene

**Dependencies**

- finalize near release

# 2. Entry files

## `src/index.ts`

**What changes**

- create descriptor factory only
- export plugin options type if needed
- declare:
  - `id`
  - `version`
  - `entrypoint`
  - `adminEntry`
  - `componentsEntry`
  - `capabilities: ["email:send"]`
  - `storage`
  - `adminPages`
  - `adminWidgets`

**Why**

- DD-01, DD-04
- aligns with the split entry pattern in `emdash-restrict-with-stripe`

**Dependencies**

- `src/storage.ts`
- `src/plugin.ts` path must be decided

## `src/plugin.ts`

**What changes**

- move runtime `definePlugin({...})` here
- register only Release A hooks and routes
- add `admin.settingsSchema`
- add `admin.portableTextBlocks`
- add cleanup cron hook
- remove:
  - `definition` route
  - Turnstile status route
  - digest hook behavior
  - webhook/autoresponder logic
  - media/network assumptions

**Why**

- DD-01, DD-03, DD-04, DD-08

**Dependencies**

- `src/storage.ts`
- `src/handlers/*`
- `src/schemas.ts`
- `src/admin.tsx`
- `src/astro/index.ts`

# 3. Shared model and validation files

## `src/types.ts`

**What changes**

Start from `emdash/packages/plugins/forms/src/types.ts`, then:

- keep `FormDefinition`
- keep `FormPage`
- keep `FormField`
- restrict allowed `FieldType` union to:
  - `text`
  - `email`
  - `textarea`
  - `select`
  - `checkbox`
- trim form settings to Release A
- trim submission shape:
  - remove `files`
  - remove `starred`
  - remove `notes`
  - remove stored raw IP
- keep helpers if still used

**Why**

- DD-02, DD-04, DD-05

**Dependencies**

- `src/schemas.ts`
- `src/validation.ts`
- `src/handlers/*`
- `src/admin.tsx`
- `src/astro/FormEmbed.astro`

## `src/storage.ts`

**What changes**

Start from the baseline `storage.ts`, then:

- keep `forms` indexes:
  - `status`
  - `createdAt`
  - unique `slug`
- trim `submissions` indexes to:
  - `formId`
  - `status`
  - `createdAt`
  - `["formId", "createdAt"]`
- remove `starred` and other unused indexes

**Why**

- smaller, cleaner MVP storage contract

**Dependencies**

- `src/index.ts`
- `src/plugin.ts`

## `src/schemas.ts`

**What changes**

Start from the baseline `schemas.ts`, then:

- restrict field type enum
- enforce one page in create/update
- remove file schemas
- remove Turnstile/webhook/autoresponder/digest settings
- keep `submitSchema`
- keep admin CRUD schemas
- keep `submissions/export` schema
- keep `redirectUrl` as `http`/`https` only

**Why**

- DD-02, DD-03, DD-04

**Dependencies**

- `src/types.ts`
- `src/handlers/*`

## `src/validation.ts`

**What changes**

Start from the baseline `validation.ts`, then:

- remove file validation branches
- remove unsupported field-type branches
- keep email/select/checkbox checks
- make required checkbox validation explicit

**Why**

- Release A field set is small

**Dependencies**

- `src/types.ts`
- `src/handlers/submit.ts`

## `src/format.ts`

**What changes**

Start from the baseline `format.ts`, then:

- keep notification email formatting
- keep CSV formatting
- remove webhook payload formatting
- remove digest formatting

**Why**

- Release A has email notifications and CSV only

**Dependencies**

- `src/handlers/submit.ts`
- `src/handlers/submissions.ts`

## `src/security.ts` (new)

**What changes**

Create helpers for:

- honeypot evaluation
- rate-limit bucket key generation
- KV read/update for submit throttling
- generic abuse response decisions

**Why**

- DD-06
- keeps `submit.ts` from turning into a monolith

**Dependencies**

- `src/plugin.ts`
- `src/handlers/submit.ts`

# 4. Handler files

## `src/handlers/forms.ts`

**What changes**

Start from baseline `handlers/forms.ts`, then:

- keep list/create/update/delete
- remove duplicate if intentionally out of scope
- strip digest scheduling logic
- strip per-form advanced settings merging
- enforce one-page-only data shape
- enforce field-name uniqueness

**Why**

- DD-02
- Release A removes digest/autoresponder/webhook complexity

**Dependencies**

- `src/types.ts`
- `src/schemas.ts`

## `src/handlers/submit.ts`

**What changes**

Start from baseline `handlers/submit.ts`, then:

- keep form lookup
- keep paused-form rejection
- keep validation
- keep submission storage
- keep counter update
- keep email notification path
- remove:
  - file-upload handling
  - Turnstile verification
  - autoresponder
  - webhook delivery
  - public `definition` handler
- add:
  - honeypot helper call
  - rate-limit helper call
  - default-recipient fallback
  - privacy-trimmed metadata

**Why**

- DD-03, DD-04, DD-05, DD-06

**Dependencies**

- `src/security.ts`
- `src/validation.ts`
- `src/format.ts`
- `src/types.ts`

## `src/handlers/submissions.ts`

**What changes**

Start from baseline `handlers/submissions.ts`, then:

- keep list/get/update/delete/export
- strip file-delete cleanup
- strip unused metadata assumptions
- export CSV only for Release A
- keep count recomputation after delete

**Why**

- Release A has no media handling

**Dependencies**

- `src/format.ts`
- `src/types.ts`

# 5. Frontend files

## `src/astro/FormEmbed.astro`

**What changes**

Start from baseline `FormEmbed.astro`, then:

- render single-page form only
- remove multi-page progress and nav
- remove Turnstile placeholder
- keep honeypot field
- remove any dependency on public `definition`
- use the Release A field set only

**Why**

- DD-02, DD-03

**Dependencies**

- `src/types.ts`
- `src/client/index.ts`

## `src/astro/index.ts`

**What changes**

- export `blockComponents` map for the Contact Form block type

**Why**

- needed for site rendering in trusted/native mode

**Dependencies**

- `FormEmbed.astro`

## `src/client/index.ts`

**What changes**

Start from baseline client code, then:

- keep progressive submit enhancement
- remove multi-page logic
- remove file handling
- remove Turnstile handling
- keep inline status rendering

**Why**

- Release A visitor UX

**Dependencies**

- `FormEmbed.astro`
- public submit route contract

## `src/styles/forms.css`

**What changes**

Start from baseline stylesheet, then:

- remove multi-page progress styles
- remove file field styles if any
- keep core field, error, help, and submit styles

**Why**

- smaller CSS surface

**Dependencies**

- `FormEmbed.astro`

# 6. Admin UI files

## `src/admin.tsx`

**What changes**

Start from baseline `admin.tsx`, then:

- keep forms page
- keep submissions page
- keep recent-submissions widget
- remove unsupported field types from editor UI
- remove multi-page UI
- remove Turnstile warnings
- remove file/webhook/digest/autoresponder settings UI
- simplify submission detail to Release A metadata and status
- ensure routes match the trimmed runtime

**Why**

- DD-02, DD-04, DD-07

**Dependencies**

- private route set must be stable
- `src/types.ts`

# 7. Test files

## `tests/unit/*`

**What changes**

Create tests for:

- validation helpers
- schema guards
- rate-limiting helper
- CSV formatting
- recipient fallback

**Why**

- low-cost, high-signal coverage

**Dependencies**

- core modules stable

## `tests/integration/*`

**What changes**

Create integration tests for:

- forms CRUD
- submit route
- submissions export
- cleanup cron

**Why**

- verifies the plugin contract against EmDash behavior

**Dependencies**

- runtime wiring stable

## `tests/e2e/*`

**What changes**

Create one happy-path e2e for:

- create form
- embed form
- submit form
- review submission

**Why**

- catches cross-surface regressions

**Dependencies**

- admin UI and renderer stable

# 8. Marketplace-track files

These are Release B files. Do not create until Release A is complete.

## `src/sandbox-entry.ts`

**What changes**

- define standard-format plugin runtime for marketplace use

**Why**

- required for `emdash plugin bundle` / `emdash plugin publish`

**Dependencies**

- marketplace adaptation decision completed

## Block Kit admin route implementation

**What changes**

- replace React admin usage in the marketplace-target package

**Why**

- marketplace bundle cannot rely on `admin.entry` React components

**Dependencies**

- Release B architecture chosen
