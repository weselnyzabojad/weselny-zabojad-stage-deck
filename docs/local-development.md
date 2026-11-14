# Local Supabase development

Run the admin panel and every stage role against a fully local Supabase stack.
Nothing in this guide points at the production project.

## Prerequisites

- Node.js 22 (matching CI and Netlify). Run `nvm use` or `fnm use`; the repo
  ships `.nvmrc` and `package.json` declares `engines.node: ">=22 <23"`.
- Docker Desktop (or another Docker engine) running.
- The repository dependencies (`npm ci`).
- Supabase CLI available as `npx supabase` (or install it globally).

## Start the stack

One command starts Docker-backed Supabase, applies the base schema and every
versioned migration, writes the local env files and prints the next commands:

```bash
npm run local:start
```

`local:start` is idempotent: if the stack is already running it only refreshes
the env summary. The temporary `00000000000000_base_schema.sql` is created for
the local reset and removed in a `finally` path; it is gitignored and never
committed.

Manage the stack:

```bash
npm run local:status   # show local endpoints and keys
npm run local:stop     # stop Docker services
npm run local:reset    # recreate the database deterministically
```

The generated files are:

- `.env.local` — browser-safe Vite values (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, `VITE_DECK_MODE=local`).
- `supabase/.env.local` — local-only Edge Function values, including a freshly
  generated ES256 key pair and speech master key. Existing generated secrets are
  reused so function sessions stay stable across restarts.

Both files are gitignored. Docker must be running; the script exits with a
clear message when it is not.

The local auth config enables TOTP enrollment/verification (`[auth.mfa.totp]`)
so the owner admin flow can be exercised with a real authenticator.

## Serve the Edge Functions

`local:start` already writes `supabase/.env.local`. Serve with it:

```bash
npx supabase functions serve --env-file supabase/.env.local
```

Local function values:

| Variable | Local value |
| --- | --- |
| `ALLOWED_ORIGIN` | `http://localhost:5173` |
| `SUPABASE_URL` | local API URL from `supabase status` |
| `SUPABASE_SERVICE_ROLE_KEY` | local service-role key from `supabase status` |
| `DECK_SUPABASE_JWT_PRIVATE_KEY` / `DECK_SUPABASE_JWT_KEY_ID` | generate a local ES256 key pair, never reuse production |
| `PUBLIC_DECK_URL` | `http://localhost:5173` |
| `SPEECH_SECRET_MASTER_KEY` | any 32-byte random local value |
| Google Drive values | optional; use a test service account only |

Do not put production secrets in `supabase/.env.local`.

## Point Vite at the local stack

`local:start` writes `.env.local` already. It contains only local values:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local anon key>
VITE_DECK_MODE=local
```

Then:

```bash
npm run dev
```

## Local admin and demo wedding

`npm run local:reset` (and the first `local:start`) runs `npm run local:seed`.
The seed is local-only, deterministic and safe to rerun. It creates the owner
auth user, inserts the `public.app_admins` allowlist row, and seeds the demo
wedding:

| Item | Value |
| --- | --- |
| Admin | `owner@local.test` / `local-owner-123` |
| Wedding | `2026-08-20_jennifer_guillaume` |
| Room code | `demo01` |
| MC / DJ / photo1 / photo2 / video / venue / speaker PINs | `111111` … `777777` |

The seed refuses any Supabase URL that is not localhost, 127.0.0.1 or ::1.
TOTP enrollment happens on the first admin sign-in; the seeded password and PINs
are disposable local credentials and must never be reused remotely.

1. Open Studio at `http://127.0.0.1:54323`.
2. Sign in at `http://localhost:5173/admin` with the seeded owner account and
   complete TOTP enrollment.
3. Join a role with its PIN at `http://localhost:5173/<roomCode>/<role>`.
4. The Song Requestor link is available from the VIP admin/role surface.

There is no committed production seed; the admin panel remains the production
provisioning source.

## Smoke check

- `http://localhost:5173/admin` loads and signs in.
- `admin_api` responds to a read action (wedding library).
- `admin_drive` reports its configuration state.
- A role PIN joins the deck locally.
- `npx supabase status` shows only local endpoints; production is untouched.

## Stop

```bash
npm run local:stop
```

Use `npx supabase stop --no-backup` only when you intentionally want to delete
the local Docker volumes.

## Production isolation

The local workflow is deliberately isolated from the hosted project:

- `local:seed`, `test:local` and the shared guard accept only `localhost`,
  `127.0.0.1` or `::1`. A remote `VITE_SUPABASE_URL` aborts before any write.
- No `local:*` script runs `supabase link`, `supabase db push` or
  `supabase config push`.
- `.env.local` and `supabase/.env.local` are gitignored. Never copy them to a
  hosted environment.
- `supabase/config.toml` is the hosted-mirror config; local Docker settings stay
  in the CLI defaults and the temporary baseline.
- `npm run validate:env -- --require-production` rejects localhost URLs.

If someone links the repository to the hosted project by mistake:

1. Run `npx supabase unlink`.
2. Delete `.supabase/` and any generated `.env.local` files.
3. Re-run `npm run local:start`; it only starts the local Docker stack.
4. Never run `db push` against the linked project to "fix" local drift.

## Safety rules

- Never run `supabase link` against production for local work.
- Never put the production project URL, service-role key or JWT secret in
  `supabase/.env.local` or `.env.local`.
- The production `ALLOWED_ORIGIN` stays `https://deck.weselnyzabojad.pl`.
- Local Docker volumes can be deleted with `npx supabase stop --no-backup`.

Runtime verification of this stack is tracked in #889; this document and the
example env file are the reproducible scaffolding (issue #904).
