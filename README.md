# EmDash Contact Forms

Production-ready contact forms for EmDash CMS.

## Release A scope

This package is the **trusted/native** Release A implementation described in the local doc pack:

- admin CRUD for simple contact forms
- Portable Text block embed
- server-rendered form markup with progressive enhancement
- one public route: `submit`
- honeypot + KV-backed per-IP rate limiting
- submission inbox, detail, archive, delete, CSV export
- weekly retention cleanup

## Important scope note

**Release A is provider-agnostic.** `@masonjames/emdash-contact-forms` sends notifications through EmDash’s configured email pipeline via `ctx.email.send()`. It does **not** implement provider-specific SMTP/API transports or ship provider-specific credential settings.

If your EmDash site already has a working email provider configured, this plugin can use it for submission notifications.

## Install

```bash
npm install @masonjames/emdash-contact-forms
```

Then register the plugin in `astro.config.mjs`:

```ts
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import { contactFormsPlugin } from "@masonjames/emdash-contact-forms";

export default defineConfig({
  integrations: [
    emdash({
      plugins: [contactFormsPlugin()],
    }),
  ],
});
```

Optional default frontend styles:

```ts
import "@masonjames/emdash-contact-forms/styles";
```

## Plugin settings

Plugin-level settings are managed through EmDash’s plugin settings UI:

- `defaultNotificationEmail`
- `retentionDays`
- `rateLimitMaxPerHour`
- `rateLimitWindowSeconds`

Per-form settings:

- confirmation message
- redirect URL
- notify emails
- submit button label

If a form has no explicit notification recipients, the plugin falls back to `defaultNotificationEmail`.

## Security notes

- only `email:send` is requested
- no `network:fetch`
- no `write:media`
- no public form-definition route
- no raw IP persisted in submissions
- honeypot failures return the same success shape as real submits
- notification send failures are logged but never exposed to visitors

## Stored submission data

Each submission stores:

- the form id
- submitted field values
- submission status
- creation timestamp
- request metadata limited to `userAgent`, `referer`, and `country` when available

The plugin does **not** store raw IP addresses.

## Retention

`retentionDays` controls how long submissions are kept before the weekly cleanup cron removes expired rows. Set it to `0` to disable automatic cleanup.

## Deployment guidance

The built-in rate limiter is best-effort and intentionally lightweight. In production, also configure:

- reverse-proxy or WAF rate limits
- bot mitigation at the edge where available
- email provider monitoring and bounce handling outside plugin scope

## Marketplace

This repository ships the native/trusted Release A package. The Marketplace / `emdash plugin publish` adaptation is a separate Release B track documented in `06-MARKETPLACE-ADAPTATION-PLAN.md`.
