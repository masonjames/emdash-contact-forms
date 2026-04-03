# Marketplace Adaptation Plan

This file documents what must change before a contact-forms package can be published with:

```bash
emdash plugin validate
emdash plugin bundle
emdash plugin publish --build
```

# 1. Why Release A is not directly publishable

Release A intentionally uses native/trusted features:

- `admin.entry` with React UI
- `admin.portableTextBlocks`
- Astro renderer via `componentsEntry`

Those are the exact surfaces that make the product good in trusted mode, but they are the surfaces that block or complicate marketplace bundling.

# 2. Blocking incompatibilities

## Blocking issue A: React admin

Marketplace-compatible bundles cannot rely on native React admin entrypoints.

### Current Release A surface

- `src/admin.tsx`
- descriptor `adminEntry`
- runtime `admin.entry`

### Required change

Replace React admin pages/widgets with a standard-plugin `admin` route that returns Block Kit responses.

## Blocking issue B: Portable Text block contribution

Portable Text blocks and site-side Astro rendering are native/trusted features.

### Current Release A surface

- runtime `admin.portableTextBlocks`
- descriptor `componentsEntry`
- `src/astro/FormEmbed.astro`

### Required change

Choose one of these two paths:

#### Path 1: Split-package strategy

Create:

- a marketplace-compatible core plugin for submissions/admin logic
- a separate trusted/native companion package for the Portable Text block and Astro renderer

This is the most realistic approach if the rich content embed remains mandatory.

#### Path 2: Same-package standardization

Remove the Portable Text block entirely from the marketplace-target package and replace it with a different embed mechanism.

This is only acceptable if the product definition is intentionally loosened for marketplace installs.

# 3. Recommended adaptation strategy

## Recommendation

Use **Path 1: split-package strategy**.

### Package A: marketplace core

Suggested package:

- `@masonjames/emdash-contact-forms-core`

Responsibilities:

- forms storage
- submit route
- submissions admin via Block Kit
- notification emails
- CSV export
- cleanup cron

Expected format:

- standard plugin
- `src/index.ts` descriptor factory
- `src/sandbox-entry.ts` runtime
- no React admin
- no Portable Text blocks
- no Astro renderer

### Package B: native companion

Suggested package:

- `@masonjames/emdash-contact-forms`

Responsibilities:

- Portable Text block
- Astro renderer
- optional richer trusted-mode admin UX

This package remains config-installed and can consume the same underlying routes or shared logic.

# 4. Minimum work to create a marketplace-compatible core

## Phase M1: Extract shared logic

- [ ] move types, validation, formatting, and pure helpers into shared modules
- [ ] separate business logic from React admin concerns
- [ ] separate business logic from Astro renderer concerns

## Phase M2: Create standard plugin package

- [ ] create `src/index.ts` descriptor factory
- [ ] create `src/sandbox-entry.ts`
- [ ] move runtime to `definePlugin({ hooks, routes, admin })`
- [ ] keep only standard-compatible capabilities and routes
- [ ] keep the single public `submit` route

## Phase M3: Replace admin UI with Block Kit

- [ ] add `admin` route
- [ ] implement page load for forms page
- [ ] implement page load for submissions page
- [ ] implement form create/update/delete interactions
- [ ] implement submissions list/detail/archive/export interactions
- [ ] add widget responses for recent submissions

## Phase M4: Remove native-only surfaces

- [ ] remove `admin.entry`
- [ ] remove React `src/admin.tsx` from the marketplace package
- [ ] remove `admin.portableTextBlocks`
- [ ] remove `componentsEntry`
- [ ] remove Astro renderer from the marketplace package

## Phase M5: Bundle validation and assets

- [ ] add README
- [ ] add `icon.png` 256x256
- [ ] add screenshots if desired
- [ ] confirm bundle size stays under limit
- [ ] confirm no Node built-ins are imported by backend bundle

## Phase M6: Publish flow

- [ ] run `emdash plugin validate`
- [ ] run `emdash plugin bundle`
- [ ] inspect tarball contents
- [ ] run `emdash plugin publish --build`
- [ ] review audit output

# 5. Marketplace package checklist

A marketplace-target package is ready when all are true:

- [ ] uses standard plugin format
- [ ] has `src/sandbox-entry.ts`
- [ ] has no React admin dependency for runtime behavior
- [ ] has no Portable Text block requirement
- [ ] has an `admin` route if it declares pages or widgets
- [ ] passes `emdash plugin validate`
- [ ] passes `emdash plugin bundle`
- [ ] is semantically versioned for publish

# 6. What not to do

- [ ] do not try to force the Release A native package through bundle validation unchanged
- [ ] do not keep `portableTextBlocks` in the marketplace-target runtime
- [ ] do not keep `admin.entry` in the marketplace-target runtime
- [ ] do not widen capabilities to compensate for missing design work
- [ ] do not start marketplace packaging before the trusted/native product is already solid

# 7. Success definition for Release B

Release B is successful when:

- the marketplace-target package validates cleanly
- the published bundle passes audit
- admin UI works through Block Kit
- the public submit route still matches the hardened Release A behavior
- scope remains intentionally smaller than the original baseline


# 8. Chosen implementation path

- native companion stays at repo root as `@masonjames/emdash-contact-forms`
- marketplace-target package starts at `packages/contact-forms-core` as `@masonjames/emdash-contact-forms-core`
- plugin id for the new core package is `masonjames-contact-forms-core`
- first slice scope is standard descriptor + sandbox runtime + minimal Block Kit admin + hardened submit path parity
