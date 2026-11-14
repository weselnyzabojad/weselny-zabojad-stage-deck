# Local Supabase development

Run the admin panel and every stage role against a fully local Supabase stack.
Nothing in this guide points at the production project.

## Prerequisites

- Docker Desktop (or another Docker engine) running.
- Node.js 22 and the repository dependencies (`npm ci`).
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

1. Open Studio at `http://127.0.0.1:54323`.
2. Authentication → Users → Add user: create the local owner account.
3. Insert that user id into `public.app_admins` with the SQL editor.
4. Sign in at `http://localhost:5173/admin`, complete TOTP enrollment, then
   create/duplicate a wedding and generate role PINs from the admin panel.
5. Join a role with its PIN at `http://localhost:5173/<roomCode>/<role>`.

There is no committed seed with real credentials; the admin panel is the seed
source so PINs, sessions and revisions follow the real flow.

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

## Safety rules

- Never run `supabase link` against production for local work.
- Never put the production project URL, service-role key or JWT secret in
  `supabase/.env.local` or `.env.local`.
- The production `ALLOWED_ORIGIN` stays `https://deck.weselnyzabojad.pl`.
- Local Docker volumes can be deleted with `npx supabase stop --no-backup`.

Runtime verification of this stack is tracked in #889; this document and the
example env file are the reproducible scaffolding (issue #904).
