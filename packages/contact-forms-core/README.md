# EmDash Contact Forms Core

Marketplace-target Release B core package for EmDash contact forms.

## Scope

This package is the **standard/sandbox** marketplace adaptation track.
It intentionally keeps only the core backend and Block Kit admin path:

- storage for forms and submissions
- hardened public `submit` route
- weekly retention cleanup
- Block Kit admin route for overview, submissions, settings, and widget scaffolding

## Not included here

This package does **not** ship:

- React admin UI
- Portable Text block contribution
- Astro renderer
- client-side progressive enhancement

Those remain in the native companion package at the repository root:
`@masonjames/emdash-contact-forms`.

## Validate / bundle

```bash
emdash plugin validate --dir .
emdash plugin bundle --dir .
```

## Current slice

This first Release B slice focuses on:

- standard descriptor + sandbox entry
- shared domain/service logic ported from Release A
- minimal Block Kit admin pages/widgets
- settings management through the `admin` route
- preserving the hardened submit path behavior
