# EmDash Contact Forms: Codex Doc Pack

This doc pack is the implementation handoff for building **EmDash Contact Forms** as a production-ready repository and npm package.

## What this pack decides

- **Repository name:** `emdash-contact-forms`
- **Primary npm package:** `@masonjames/emdash-contact-forms`
- **Primary plugin id:** `masonjames-contact-forms`
- **Release A:** trusted/native npm package for use in `plugins: []`
- **Release B:** marketplace adaptation track for `emdash plugin publish`

## Why there are two release tracks

The requested product needs:

- React admin pages
- a Portable Text form block
- Astro site rendering components

Those are native/trusted plugin surfaces. EmDash’s marketplace bundle flow is built around the standard/sandbox-compatible format, and bundle validation rejects or warns on native-only surfaces such as `admin.entry` React UI and `portableTextBlocks`. Build **Release A first**, then execute the marketplace adaptation track deliberately.

## Document map

1. [`01-PRD.md`](./01-PRD.md)
   - refined product scope
   - resolved naming, security, and release-channel decisions
   - acceptance criteria

2. [`02-TECHNICAL-DESIGN.md`](./02-TECHNICAL-DESIGN.md)
   - architecture and decision log
   - repository structure
   - route, storage, and settings model
   - source-of-truth constraints from EmDash

3. [`03-CODEX-IMPLEMENTATION-PLAN.md`](./03-CODEX-IMPLEMENTATION-PLAN.md)
   - the main execution plan for Codex
   - phased checklists
   - atomic ordering rules
   - definitions of done

4. [`04-FILE-BY-FILE-PLAN.md`](./04-FILE-BY-FILE-PLAN.md)
   - file-by-file impact
   - what to copy from the `forms` baseline
   - what must be trimmed or rewritten

5. [`05-QA-RELEASE-CHECKLIST.md`](./05-QA-RELEASE-CHECKLIST.md)
   - test matrix
   - accessibility and security checks
   - GitHub/npm release gate

6. [`06-MARKETPLACE-ADAPTATION-PLAN.md`](./06-MARKETPLACE-ADAPTATION-PLAN.md)
   - the explicit path from native/trusted to marketplace publication
   - the blocking incompatibilities
   - the work needed before `emdash plugin bundle` and `emdash plugin publish`

## Recommended Codex workflow

1. Read `01-PRD.md` and `02-TECHNICAL-DESIGN.md`.
2. Execute phases from `03-CODEX-IMPLEMENTATION-PLAN.md` in order.
3. Update checkboxes in that file as work is completed.
4. Use `04-FILE-BY-FILE-PLAN.md` when making concrete edits.
5. Run all gates in `05-QA-RELEASE-CHECKLIST.md` before calling the package done.
6. Do **not** start marketplace publication work until Release A is green.

## Non-negotiable guardrails

- Keep MVP scope smaller than the existing `packages/plugins/forms` baseline.
- Do not carry forward:
  - file uploads
  - multi-page flows
  - conditional logic
  - Turnstile/CAPTCHA
  - webhook delivery
  - autoresponders
  - digest emails
- Keep the public surface to **one write route**: `submit`.
- Keep plugin capabilities to **`email:send` only** in Release A.
- Build from the existing EmDash `forms` plugin patterns, but treat that code as a **reference implementation**, not the scope definition.


## Release B implementation choice

The split-package strategy is now active in-repo:

- native companion package: repo root (`@masonjames/emdash-contact-forms`)
- marketplace core package: `packages/contact-forms-core` (`@masonjames/emdash-contact-forms-core`)
