# Codex Handoff Prompt

Use this file as the working brief when handing implementation to Codex.

## Mission

Build the repository and package described in this doc pack as a production-ready EmDash contact form plugin.

## Hard constraints

- The product is **Release A trusted/native**, not direct marketplace output.
- Package name: `@masonjames/emdash-contact-forms`
- Plugin id: `masonjames-contact-forms`
- Capabilities: `email:send` only
- Public routes: `submit` only
- Use the EmDash `packages/plugins/forms` code as a donor baseline, not as the product scope.
- Follow the external-repo descriptor/runtime split used by `emdash-restrict-with-stripe`.
- Keep the internal `pages` shape if that avoids needless rewrite, but enforce one page.
- Do not implement:
  - file uploads
  - multi-page forms
  - conditional logic
  - Turnstile/CAPTCHA
  - webhook delivery
  - autoresponders
  - digest emails
  - extra capabilities

## Required reading order

1. `01-PRD.md`
2. `02-TECHNICAL-DESIGN.md`
3. `03-CODEX-IMPLEMENTATION-PLAN.md`
4. `04-FILE-BY-FILE-PLAN.md`
5. `05-QA-RELEASE-CHECKLIST.md`

## Execution rules

- Work phase by phase.
- Update the checkboxes in `03-CODEX-IMPLEMENTATION-PLAN.md` as work is completed.
- Prefer smaller, independently testable commits.
- If a baseline file contains out-of-scope logic, remove it instead of preserving it.
- If you hit marketplace questions, stop and consult `06-MARKETPLACE-ADAPTATION-PLAN.md`. Do not mix Release B work into Release A unless explicitly asked.

## Definition of success

Success means:

- a standalone repo exists
- the trusted/native plugin installs cleanly
- forms can be created, embedded, submitted, reviewed, archived, and exported
- the repo is GitHub/npm ready
- the plugin remains intentionally narrower than the current EmDash `forms` baseline
