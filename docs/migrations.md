# Database migration order

`supabase/schema.sql` is **base-only**. It bootstraps an empty database and
guards itself against re-runs once `supabase_migrations.schema_migrations` has
rows. Never use it to patch an existing project.

## Fresh project

1. Run `supabase/schema.sql` once on an empty database.
2. Apply every file in `supabase/migrations/` in filename order (`YYYYMMDDNNNN`).
3. Deploy Edge Functions.
4. Verify the final policies/grants with the `Schema, fixtures, tests and build`
   workflow and the queries in `docs/admin-setup-and-secrets.md`.

## Existing project

Apply only pending migrations (`supabase db push` or the dashboard). Do not run
`schema.sql`; it aborts by design rather than recreating old policies, broad
grants or the legacy wipe RPC.

## Contract sources

- Wedding-id format: `supabase/functions/_shared/adminPublish.js`
  (`WEDDING_ID_PATTERN`), re-exported by sharing helpers.
- Speech/game folder paths and filenames: `_shared/speechDoc.js`,
  `_shared/gameQuestions.js`, `_shared/googleDrive.js`.
- Private sharing boundary: `_shared/driveSharing.js` and the secrets folder
  constants.
- Browser/Edge parity: `tests/schema-contracts-1049.test.js` and the existing
  smoke/schema suites.
