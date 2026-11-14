# Local Supabase development

Run the admin panel and every stage role against a fully local Supabase stack.
Nothing in this guide points at the production project.

## Prerequisites

- Docker Desktop (or another Docker engine) running.
- Node.js 22 and the repository dependencies (`npm ci`).
- Supabase CLI available as `npx supabase` (or install it globally).

## Start the stack

```bash
npx supabase start
npx supabase db reset
npx supabase status
```

`db reset` applies `supabase/migrations` in order. The local API and Studio are
printed by `supabase status` (defaults: API `http://127.0.0.1:54321`, Studio
`http://127.0.0.1:54323`).

## Serve the Edge Functions

```bash
cp supabase/.env.example supabase/.env.local
# fill the local values from `npx supabase status`
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

```bash
cp .env.example .env.local
```

Set only local values:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local anon key from supabase status>
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
npx supabase stop
```

## Safety rules

- Never run `supabase link` against production for local work.
- Never put the production project URL, service-role key or JWT secret in
  `supabase/.env.local` or `.env.local`.
- The production `ALLOWED_ORIGIN` stays `https://deck.weselnyzabojad.pl`.
- Local Docker volumes can be deleted with `npx supabase stop --no-backup`.

Runtime verification of this stack is tracked in #889; this document and the
example env file are the reproducible scaffolding (issue #904).
