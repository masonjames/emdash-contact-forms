# Manual smoke checklist

1. Install the package into an EmDash site and register `contactFormsPlugin()` in `astro.config.mjs`.
2. Open the EmDash admin and create a new contact form with `name`, `email`, and `message` fields.
3. Add the `Contact Form` Portable Text block to a page and select the new form.
4. Load the page publicly and verify:
   - labels/help text render accessibly
   - honeypot field is hidden
   - submit button shows loading state
5. Submit a valid form:
   - success message appears or redirect occurs
   - submission appears in the admin inbox
   - notification email is delivered through the configured EmDash provider
6. Archive the submission, unarchive it, and export CSV.
7. Delete the submission and confirm form counts update.
8. Pause the form and confirm the public page no longer offers an active submit flow.
