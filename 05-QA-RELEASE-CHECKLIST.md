# QA and Release Checklist

Use this before calling Release A done.

# 1. Unit test checklist

- [x] field validation accepts valid text field input
- [x] field validation rejects missing required field
- [x] email field validation rejects invalid email
- [x] select field validation rejects values not in options
- [x] required checkbox validation rejects unchecked value
- [x] slug normalization is stable
- [x] field-name uniqueness check fails on duplicates
- [x] honeypot helper treats non-empty value as bot signal
- [x] rate-limit helper blocks after configured threshold
- [x] CSV formatter outputs stable column order
- [x] recipient fallback uses plugin default when form recipients are empty

# 2. Integration checklist

- [x] plugin registers with `email:send` only
- [x] forms CRUD routes succeed for valid payloads
- [x] forms CRUD routes reject invalid payloads
- [x] paused forms reject submit attempts
- [x] submit route stores valid submission
- [x] submit route returns generic success on honeypot trigger
- [x] submit route rate-limits repeated abusive requests
- [x] notification email path is exercised
- [x] submission delete recomputes form counters
- [x] cleanup cron deletes expired submissions and recomputes counts
- [x] CSV export contains the submitted row

# 3. UI checklist

## Admin

- [ ] forms page loads
- [ ] new form can be created from UI
- [ ] unsupported field types are absent from the editor
- [ ] submissions page loads
- [ ] submission detail can be opened
- [ ] archive and unarchive work
- [ ] CSV export button works

## Frontend

- [ ] Contact Form block can be inserted in content
- [ ] form renders server-side
- [ ] required indicators are visible
- [ ] labels are programmatically associated with controls
- [ ] inline error state is visible after failed validation
- [ ] success state is visible after successful submit
- [ ] redirect works when configured

# 4. Accessibility checklist

- [ ] every input has a visible label
- [ ] help text is associated correctly where used
- [ ] validation messages use an accessible live region or clear association
- [ ] submit button disabled state is announced clearly enough
- [ ] focus is moved or preserved intentionally after submit failure/success
- [ ] color is not the only error indicator

# 5. Security checklist

- [x] plugin descriptor requests only `email:send`
- [x] there is exactly one public route: `submit`
- [x] no Turnstile or network-fetch code remains
- [x] no file-upload logic remains
- [x] redirect URL validation rejects `javascript:` and other non-http schemes
- [x] public errors never expose stack traces or provider details
- [x] raw IP is not stored in submission records
- [x] rate-limit KV state expires automatically
- [x] honeypot field is always injected by the renderer
- [x] paused forms do not accept submissions

# 6. Privacy checklist

- [x] README documents what submission metadata is stored
- [x] submission records contain only approved metadata
- [x] retention behavior is documented
- [x] cleanup cron is enabled in production runtime where supported

# 7. Packaging checklist

## GitHub / npm Release A

- [x] package name is correct
- [x] package exports resolve
- [x] repository URL is set
- [x] files list excludes junk
- [x] README renders correctly on GitHub
- [x] CHANGELOG includes `0.1.0`
- [x] install snippet works in a real EmDash site
- [x] local `npm pack` or `pnpm pack` smoke test succeeds

## Suggested commands

- [ ] `pnpm install`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] package smoke install in a sample EmDash site

# 8. Release sign-off checklist

- [ ] PRD acceptance criteria all pass
- [ ] QA owner has reviewed the test results
- [x] README install path is tested
- [ ] one demo site has run the plugin end to end
- [x] remaining issues are documented and intentionally deferred

# 9. Marketplace pre-check checklist

Do not run this until Release B work starts.

- [ ] read `06-MARKETPLACE-ADAPTATION-PLAN.md`
- [ ] no `admin.entry` in the marketplace-target package
- [ ] no `portableTextBlocks` in the marketplace-target package
- [ ] `src/sandbox-entry.ts` exists
- [ ] package exports include `"./sandbox"`
- [ ] `emdash plugin validate --dir packages/contact-forms-core` passes
- [ ] `emdash plugin bundle --dir packages/contact-forms-core` passes
- [ ] icon and screenshots meet bundle limits
- [ ] `emdash plugin publish --build --dir packages/contact-forms-core` is ready to run
