---
title: "PRD: EmDash Contact Forms"
status: "approved-for-build"
owner: "Mason James"
repo_name: "emdash-contact-forms"
package_name: "@masonjames/emdash-contact-forms"
plugin_id: "masonjames-contact-forms"
release_a_mode: "trusted/native npm package"
release_b_mode: "marketplace-standard adaptation"
---

# Product summary

EmDash Contact Forms is a focused contact-form plugin for EmDash. It gives site owners a dependable form builder, editors a structured content embed, operators a submission inbox, and visitors a safe anonymous submission flow.

This is a **subset-first** product. The existing EmDash `packages/plugins/forms` package is the implementation baseline, but not the scope definition.

# Problem

Contact forms are deceptively expensive:

- anonymous traffic reaches a public endpoint
- spam and abuse become operational concerns
- data must be validated and stored safely
- notification email must work reliably
- operators need enough tooling to review and export submissions

The product needs to solve the common case without becoming a giant workflow builder.

# Primary users

## Site owners

They need a working contact form without bolting on a third-party SaaS.

## Editors

They need a structured block they can place in a contact page or campaign page.

## Operators

They need to review, archive, and export submissions.

# Goals

1. Let admins create and manage simple contact forms.
2. Let editors embed those forms in content with a structured Portable Text block.
3. Let anonymous visitors submit a form through a small, hardened public route.
4. Persist submissions in plugin storage.
5. Notify configured recipients by email.
6. Provide basic operator tooling: list, inspect, archive, export.

# Non-goals for Release A

- file uploads
- multi-page forms
- conditional logic
- radio groups and checkbox-group fields
- webhooks
- autoresponders
- digest emails
- CAPTCHA or Turnstile
- unrestricted outbound network calls
- a same-cycle marketplace bundle

# Product decisions

## Naming

- **Product name:** EmDash Contact Forms
- **Repository:** `emdash-contact-forms`
- **npm package:** `@masonjames/emdash-contact-forms`
- **plugin id:** `masonjames-contact-forms`

The plugin id is intentionally unique and simple, so it does not collide with the upstream `@emdash-cms/plugin-forms` package.

## Release strategy

### Release A

Trusted/native plugin distributed through GitHub and npm, installed via EmDash config.

### Release B

A follow-on marketplace adaptation track for `emdash plugin publish`. This is separate because the requested editor and site-rendering experience depends on native-only surfaces.

# MVP scope

## In scope

- admin CRUD for forms
- Portable Text form block
- server-rendered form markup
- public anonymous submit route
- honeypot spam protection
- per-form notification emails with plugin-level default fallback
- submission inbox
- submission detail view
- submission archive/unarchive
- CSV export
- weekly retention cleanup
- minimal rate limiting via plugin KV

## Explicitly out of scope

- any media upload flow
- any `write:media` capability
- any `network:fetch` capability
- any public `definition` route
- any native feature that widens public exposure beyond the submit route

# Functional requirements

## Form builder

Admins can create a form with these field types only:

- text
- email
- textarea
- select
- checkbox

Each field supports:

- label
- machine name
- required flag
- placeholder
- help text
- options for `select`

Form status:

- active
- paused

## Embed and rendering

Editors can place a `Contact Form` Portable Text block and select an existing form.

The frontend renderer must:

- render HTML on the server
- use standard label/input/textarea/select/button semantics
- include a honeypot field automatically
- support progressive enhancement on submit
- not require a second public definition endpoint

## Submission flow

Visitors can submit anonymously.

The submit flow must:

1. resolve the form by id
2. reject paused forms
3. run honeypot checks
4. enforce per-IP rate limiting
5. validate input against the stored form definition
6. persist the submission
7. send notification emails
8. return a safe response payload without leaking internals

## Submission management

Operators can:

- list submissions by form
- inspect one submission
- archive and unarchive submissions
- delete a submission
- export submissions to CSV

Submission statuses in Release A:

- `new`
- `read`
- `archived`

`read` stays in scope because it materially improves operator triage and is already supported by the baseline implementation.

# Settings

## Plugin-level settings

- `settings:defaultNotificationEmail`
- `settings:retentionDays`
- `settings:rateLimitMaxPerHour`
- `settings:rateLimitWindowSeconds`

## Per-form settings

- `confirmationMessage`
- `redirectUrl`
- `notifyEmails`
- `submitLabel`

If a form has no explicit notification recipients, the plugin falls back to `settings:defaultNotificationEmail`.

## Removed from scope

These settings are not valid for Release A:

- `defaultFromName`
- `spamMode` selector
- webhook URL
- digest settings
- autoresponder settings
- Turnstile site or secret key

`defaultFromName` is deliberately excluded because the current EmDash email API exposes `to`, `subject`, `text`, and optional `html`, not a plugin-controlled `from` field.

# Capabilities

Release A capability set:

- `email:send`

Release A must **not** request:

- `write:media`
- `network:fetch`
- `network:fetch:any`

# Storage model

## Collection: `forms`

Indexes:

- `status`
- `createdAt`
- unique `slug`

Stored fields:

- `name`
- `slug`
- `status`
- `pages` with exactly one page
- `settings`
- `submissionCount`
- `lastSubmissionAt`
- `createdAt`
- `updatedAt`

The internal `pages` array shape is intentionally retained from the existing EmDash `forms` baseline to reduce rewrite risk. Release A enforces exactly one page.

## Collection: `submissions`

Indexes:

- `formId`
- `status`
- `createdAt`
- `["formId", "createdAt"]`

Stored fields:

- `formId`
- `data`
- `status`
- `createdAt`
- `meta`

Submission metadata in Release A:

- `userAgent`
- `referer`
- `country`

The plugin does **not** persist raw IP addresses in submission records. Raw IP may be used transiently for rate limiting in KV state only.

# Routes

## Public

- `submit`

## Private

- `forms/list`
- `forms/create`
- `forms/update`
- `forms/delete`
- `submissions/list`
- `submissions/get`
- `submissions/update`
- `submissions/delete`
- `submissions/export`

Release A intentionally avoids a public `definition` route so the product matches the original narrow-surface security posture.

# Security and abuse requirements

## Required

- strict schema validation
- honeypot protection
- generic error handling for public requests
- per-IP rate limiting in KV
- no raw IP persistence in submission records
- redirect URLs limited to `http` or `https`
- notification failures logged but never exposed to visitors

## Recommended deployment guidance

- WAF or reverse-proxy rate limits in production
- bot mitigation at the edge where available
- email provider monitoring and bounce handling outside plugin scope
- privacy notice on the site if submissions contain personal data

# UX requirements

## Admin UX

- fast list view for forms
- inline “active / paused” signal
- clean single-page field builder
- obvious submission triage flow
- CSV export available from submissions view

## Visitor UX

- clear required-field markers
- accessible labels and help text
- inline validation error display
- visible success state
- optional redirect after submit

# Success metrics

The product is successful when:

1. an admin can create a working form end to end
2. an editor can place that form in content
3. an anonymous visitor can submit it
4. a valid submission is stored
5. a notification email is sent
6. an operator can archive and export submissions
7. the plugin ships with only one public write route and one requested capability

# Acceptance criteria

- [ ] Admin can create, edit, pause, and delete a form.
- [ ] Form fields are limited to the approved Release A set.
- [ ] Portable Text block embed works in trusted/native installs.
- [ ] Form renders server-side with accessible HTML controls.
- [ ] Anonymous submission succeeds for a valid active form.
- [ ] Honeypot rejects bot-like submissions without exposing internals.
- [ ] Per-IP rate limit blocks abusive repeat submissions.
- [ ] Submissions persist to plugin storage.
- [ ] Notification email is sent to per-form recipients or fallback default recipient.
- [ ] Operators can list, inspect, archive, delete, and export submissions.
- [ ] Plugin requests only `email:send`.
- [ ] Release A does not implement file uploads, multi-page flows, webhooks, autoresponders, digests, or Turnstile.

# Risks and mitigations

## Risk: scope creep from the existing forms baseline

**Mitigation:** baseline code is a donor library, not the product definition. Out-of-scope features are removed or fenced immediately.

## Risk: native-only features block marketplace bundling

**Mitigation:** split release tracks. Finish trusted/native product first, then run the marketplace adaptation track explicitly.

## Risk: spam volume exceeds honeypot + plugin rate limit

**Mitigation:** document edge/WAF rate limiting as part of deployment guidance and keep the submit handler minimal.

## Risk: privacy concerns around metadata

**Mitigation:** do not store raw IP in submission records and keep stored metadata minimal.

# Post-Release-A backlog

- file uploads
- additional field types
- multi-step forms
- webhooks
- autoresponders
- digest emails
- Turnstile/CAPTCHA
- marketplace-compatible standard plugin package
