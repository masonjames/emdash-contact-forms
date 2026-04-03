# Codex Implementation Plan

Use this file as the main build workboard. Update checkboxes as work completes.

# Operating rules for Codex

- Work in phase order.
- Keep each phase independently compilable where possible.
- Do not reintroduce out-of-scope features from the EmDash forms baseline.
- Do not widen requested capabilities beyond `email:send`.
- If a baseline module carries extra functionality, trim it immediately instead of “leaving it for later”.
- Mark each task complete in this file as you land it.

# Phase 0: Repository and product decisions

## Objective

Lock decisions that change file layout and scope.

## Tasks

- [x] Confirm repository name: `emdash-contact-forms`
- [x] Confirm package name: `@masonjames/emdash-contact-forms`
- [x] Confirm plugin id: `masonjames-contact-forms`
- [x] Confirm Release A target is native/trusted npm install
- [x] Confirm Release B marketplace adaptation is deferred
- [x] Confirm only one capability: `email:send`
- [x] Confirm only one public route: `submit`
- [x] Confirm only five field types in Release A
- [x] Confirm no file uploads, multi-page flows, conditional logic, Turnstile, webhook, autoresponder, or digest

## Definition of done

- [x] Naming and scope are reflected in `package.json`, README, and runtime code comments.

# Phase 1: Scaffold the standalone repository

## Objective

Create a clean external-style package layout based on `emdash-restrict-with-stripe`, not a copy of the monorepo plugin directory.

## Tasks

- [x] Create `src/index.ts` as the descriptor entry
- [x] Create `src/plugin.ts` as the runtime entry
- [x] Create `src/admin.tsx`
- [x] Create `src/astro/index.ts`
- [x] Create `src/astro/FormEmbed.astro`
- [x] Create `src/client/index.ts`
- [x] Create `src/handlers/`
- [x] Create `tests/unit`, `tests/integration`, and `tests/e2e`
- [x] Write `package.json` exports for `.`, `./plugin`, `./admin`, `./astro`, `./client`
- [x] Add `README.md`, `CHANGELOG.md`, and `tsconfig.json`
- [x] Add scripts for typecheck, test, and build

## Definition of done

- [x] Repository layout matches the target structure in the technical design.
- [x] The package can be installed locally without broken export paths.

# Phase 2: Port and trim the data model

## Objective

Create the minimal Release A types, storage config, schemas, and helpers.

## Tasks

- [x] Port `storage.ts` from the baseline and remove unused indexes
- [x] Port `types.ts` from the baseline and remove file-upload and advanced settings fields
- [x] Keep the one-page `pages` shape but enforce one page
- [x] Port `schemas.ts` from the baseline
- [x] Restrict allowed field types to text, email, textarea, select, checkbox
- [x] Remove Turnstile-related schemas
- [x] Remove webhook, digest, autoresponder, and file-upload schema branches
- [x] Port `validation.ts` and trim it to Release A field types
- [x] Add `security.ts` for rate-limiting and honeypot helpers
- [x] Add `format.ts` for notification email and CSV formatting

## Atomic constraints

- [x] `types.ts`, `schemas.ts`, and `validation.ts` land together
- [x] `storage.ts` lands before any route handlers use it

## Definition of done

- [x] All core types compile.
- [x] Zod schemas match the trimmed product scope.
- [x] No type still advertises file uploads or Turnstile.

# Phase 3: Build the runtime plugin

## Objective

Wire the plugin descriptor and runtime with only the approved Release A surfaces.

## Tasks

- [x] Implement `contactFormsPlugin()` in `src/index.ts`
- [x] Implement `createPlugin()` in `src/plugin.ts`
- [x] Declare capabilities: `["email:send"]`
- [x] Remove any `allowedHosts` requirement from Release A
- [x] Register the weekly cleanup cron hook
- [x] Register only the approved routes
- [x] Add `admin.pages`, `admin.widgets`, and `admin.portableTextBlocks`
- [x] Add `admin.settingsSchema` for plugin-level settings
- [x] Remove any `settings/turnstile-status` route
- [x] Remove any `definition` public route

## Definition of done

- [x] `src/index.ts` and `src/plugin.ts` are split cleanly.
- [x] Runtime manifests only Release A features.

# Phase 4: Implement admin CRUD and submissions routes

## Objective

Ship the actual business logic.

## Tasks

### Forms handlers

- [x] Implement `forms/list`
- [x] Implement `forms/create`
- [x] Implement `forms/update`
- [x] Implement `forms/delete`
- [x] Enforce slug uniqueness
- [x] Enforce unique field names per form
- [x] Enforce one-page-only authoring

### Submit handler

- [x] Load form by id
- [x] Reject paused forms
- [x] Run honeypot logic
- [x] Run KV-based rate limit
- [x] Validate payload
- [x] Persist submission
- [x] Update form counters
- [x] Resolve notification recipients with fallback default
- [x] Send notification email(s)
- [x] Return safe success/error payloads

### Submission handlers

- [x] Implement `submissions/list`
- [x] Implement `submissions/get`
- [x] Implement `submissions/update`
- [x] Implement `submissions/delete`
- [x] Implement `submissions/export`
- [x] Recompute counts after delete or cleanup

## Atomic constraints

- [x] Submit handler, validation, formatting, and security helper changes land together
- [x] Export handler lands after submission storage shape is stable

## Definition of done

- [x] A seeded form can be submitted successfully.
- [x] A submission appears in admin and in CSV export.
- [x] Out-of-scope logic from the baseline is gone.

# Phase 5: Build the visitor-facing form renderer

## Objective

Make embedding and submission usable on the site.

## Tasks

- [x] Implement `FormEmbed.astro` with server-rendered markup
- [x] Inject a honeypot field
- [x] Render required markers and help text accessibly
- [x] Point form submit at the public route
- [x] Implement `client/index.ts` progressive enhancement
- [x] Disable submit button during requests
- [x] Render success and validation messages inline
- [x] Export block components from `src/astro/index.ts`
- [x] Verify the Portable Text block config resolves form options in admin

## Definition of done

- [x] Editors can insert a form block.
- [ ] Frontend form renders and submits successfully.
- [x] There is no dependency on a public `definition` route.

# Phase 6: Build and polish the admin UI

## Objective

Deliver a production-usable operator experience.

## Tasks

### Forms page

- [x] Forms list table
- [x] create/edit form flow
- [x] field reorder support
- [x] pause/resume actions
- [x] delete form action
- [x] remove all UI for multi-page flows and unsupported field types

### Submissions page

- [x] form filter
- [x] status filter
- [x] list view
- [x] detail panel
- [x] archive/unarchive flow
- [x] delete flow
- [x] CSV export button

### Widget

- [x] recent submissions widget

## Definition of done

- [x] Operator can manage forms without touching raw JSON.
- [x] Admin UI does not expose unsupported features.

# Phase 7: Tests and hardening

## Objective

Raise the quality bar from “works” to “shippable”.

## Tasks

### Unit tests

- [x] validation rules
- [x] slug and field-name normalization
- [x] honeypot behavior
- [x] rate-limit helper
- [x] CSV formatting
- [x] recipient fallback resolution

### Integration tests

- [x] forms CRUD
- [x] submit flow
- [x] notification side effects
- [x] submissions export
- [x] cleanup cron

### E2E / manual

- [ ] admin creates a form
- [ ] editor embeds a form
- [ ] visitor submits
- [ ] operator archives and exports

### Hardening

- [x] confirm no raw IP in submission records
- [x] confirm submit route returns generic abuse failures
- [x] confirm redirect URL validation rejects non-http schemes
- [x] confirm only `email:send` is requested

## Definition of done

- [x] Test suite is green.
- [x] Security and privacy checks are green.

# Phase 8: Repository polish and GitHub/npm readiness

## Objective

Make the repo publishable and understandable.

## Tasks

- [ ] Write README with install instructions and screenshots
- [x] Document trusted/native install in EmDash config
- [x] Document plugin settings and per-form configuration
- [x] Document deployment guidance for rate limiting
- [x] Add CHANGELOG entry for `0.1.0`
- [x] Add license if desired
- [x] Add example config snippet
- [x] Verify package metadata, keywords, repository URL, and files list
- [x] Test local install in a sample EmDash site

## Definition of done

- [x] Repo is ready for GitHub.
- [x] Package is ready for npm publish.

# Phase 9: Marketplace adaptation track

Do not start this phase until Release A is complete.

## Objective

Create a path to `emdash plugin bundle` and `emdash plugin publish`.

## Tasks

- [ ] Read `06-MARKETPLACE-ADAPTATION-PLAN.md`
- [ ] Decide between:
  - [ ] replacing React admin with Block Kit in the same package
  - [ ] splitting a marketplace core package from the native package
- [ ] Remove `admin.entry` from the marketplace-target package
- [ ] Remove `portableTextBlocks` from the marketplace-target package
- [ ] Add `src/sandbox-entry.ts` for standard plugin runtime
- [ ] Add standard plugin exports for bundling
- [ ] Add an `admin` route for Block Kit pages/widgets if marketplace admin UI is required
- [ ] Run `emdash plugin validate`
- [ ] Run `emdash plugin bundle`
- [ ] Run `emdash plugin publish --build`

## Definition of done

- [ ] The marketplace-target package validates cleanly.
- [ ] The bundle is accepted by `emdash plugin publish`.
