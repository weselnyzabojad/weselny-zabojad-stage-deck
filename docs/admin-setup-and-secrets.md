# Admin setup, environment variables and secrets

This guide explains how to configure the application from a fresh clone to a
working owner admin panel at `/admin`.

> **Never commit secrets.** `.env*` files are git-ignored. Only
> `.env.example` belongs in the repository. Never place a service-role key,
> JWT secret or Google private key behind a `VITE_*` variable — Vite bundles
> those into the browser.

---

## 1. Configuration layers

There are two separate configuration layers.

| Layer | Where it lives | Visible in browser? |
| --- | --- | --- |
| Client configuration | `.env.local` / hosting env vars | Yes |
| Server secrets | Supabase Edge Function secrets | No |

### Client variables

Create `C:\App\universal-wedding-stage-deck\.env.local` (or `.env.local` in the
project root) and add:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Optional client values:

```env
VITE_DECK_MODE=production
VITE_SUPABASE_SYNC_TABLE=live_sync_state
VITE_SUPABASE_ROOM_PREFIX=wzsd
```

Notes:

- `VITE_DECK_MODE=production` enables server-validated per-role PINs.
- Leave it unset or set `local` for the local/demo flow.
- The anon key is public by design; database access is protected by RLS.
- Restart `npm run dev` after editing `.env.local`.

Validate the client layer at any time; the command prints variable names and
messages only, never values:

```sh
npm run validate:env
```

For a local-only checkout without Supabase, use:

```sh
npm run validate:env -- --allow-missing
```

The command fails on missing required values, invalid URLs or deck modes, and
on any server secret exposed through a `VITE_*` variable.

### Server secrets

Set these with the Supabase CLI:

```sh
supabase secrets set \
  SUPABASE_URL=https://your-project-ref.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  DECK_SUPABASE_JWT_PRIVATE_KEY='{"kty":"EC",...}' \
  DECK_SUPABASE_JWT_KEY_ID=your-signing-key-kid \
  PUBLIC_DECK_URL=https://your-domain.example \
  ALLOWED_ORIGIN=http://localhost:5173 \
  GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com \
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----" \
  SPEECH_SECRET_MASTER_KEY=your-32-byte-random-secret
```

Optional:

```sh
supabase secrets set GOOGLE_DRIVE_TEST_FILE_ID=your-test-file-id
```

Production `ALLOWED_ORIGIN` must be the deployed admin origin, for example the
deck origin that serves `/admin`:

```sh
supabase secrets set ALLOWED_ORIGIN=https://deck.weselnyzabojad.pl
```

If the project uses JWT Signing Keys, role tokens are signed with our own ES256
private key: import the private JWK as a signing key, rotate to it, then set
`DECK_SUPABASE_JWT_PRIVATE_KEY` to the private JWK and `DECK_SUPABASE_JWT_KEY_ID`
to the key's `kid`. `join_room` includes the `kid` header so PostgREST can select
the matching public key. There is no HS256 fallback; the old shared secret was
removed after the rotation window.

If local and production origins are both needed, update `ALLOWED_ORIGIN`
accordingly or extend the CORS helper to support a comma-separated allowlist.

---

## 2. Prerequisites

Install and authenticate the Supabase CLI:

```sh
supabase login
supabase link --project-ref your-project-ref
```

Install project dependencies:

```sh
npm install
```

Apply database schema and migrations:

```sh
supabase db push
```

If you deploy SQL manually, at minimum apply:

- `supabase/schema.sql`
- `supabase/migrations/202611060001_owner_admin.sql`
- `supabase/migrations/202611060002_song_requests.sql`
- `supabase/migrations/202611060003_cartridge_revisions.sql`
- `supabase/migrations/202611060004_drive_publication.sql`
- `supabase/migrations/202611070001_drop_vip_contacts.sql`
- `supabase/migrations/202611090001_song_request_lifecycle.sql`

---

## 3. Deploy Edge Functions

The application uses these functions:

| Function | Purpose |
| --- | --- |
| `admin_api` | Owner admin library, revisions, PINs, archive/delete |
| `admin_drive` | Drive folder tree, Google Doc preview and publication |
| `join_room` | Production per-role PIN join and role JWT |
| `submit_song_request` | Guest song requests |
| `get_song_request_status` | Guest-only status lookup for the guest's own request |
| `reveal_speech_key` | Role-JWT-gated per-speech key reveal; deployed with `--no-verify-jwt` |

Deploy all of them:

```sh
supabase functions deploy admin_api
supabase functions deploy admin_drive
supabase functions deploy join_room
supabase functions deploy submit_song_request
supabase functions deploy get_song_request_status
# reveal_speech_key verifies the speaker role JWT itself. Platform JWT
# verification rejects the legacy HS256 role token with UNAUTHORIZED_LEGACY_JWT.
supabase functions deploy reveal_speech_key --no-verify-jwt
```

Verify the admin endpoints return a CORS preflight response:

```sh
curl -i -X OPTIONS "https://your-project-ref.supabase.co/functions/v1/admin_api" \
  -H "Origin: http://localhost:5173" \
  -H "apikey: your-public-anon-key" \
  -H "Access-Control-Request-Method: POST"
```

Repeat for `admin_drive`. A `404` means the function is not deployed.

---

## 4. Google Drive setup

1. Enable the **Google Drive API** in Google Cloud.
2. Create a service account.
3. Create a JSON key for that service account.
4. Save the values only as Supabase secrets:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
5. Share the wedding root folder with the service-account email.
6. Grant only the Drive scope needed to create, move or rename Docs: the
   `https://www.googleapis.com/auth/drive.file` scope for files the service
   account creates or opens, plus read access to the wedding tree. Do not grant
   full `drive` scope unless an existing deployment already requires it.

   **Sharing limit.** The admin sharing dialog can only grant `reader` access to
   files the service account created or opened (the `drive.file` scope), and
   only files below `secrets/<weddingId>/`. Customer-visible files under
   `YYYY/Month/<weddingId>/` and files outside the service account's scope are
   rejected. Folder-wide sharing, public links and writer/commenter roles are
   not offered.
7. Root folder:

```text
1Q7IVT0GNiLztKQE8l4eCDCRw-px1qheh
```

The expected hierarchy is:

```text
root/
  2026/
    January/
      UM-2026-01-001/                              # customer-visible
        games/
          Test Wiedzy - UM-2026-01-001
      secrets/                                     # private root
        UM-2026-01-001/
          speeches/
            UM-2026-01-001 - 1 - Bartek - Best man
          compatibility-test-game/
            Test Zgodności - UM-2026-01-001
  2027/
    September/
      UM-2027-09-001/
      secrets/
        UM-2027-09-001/
```

Only `YYYY/Month/<weddingId>/` is guaranteed to exist. The app creates any
missing `secrets/`, `secrets/<weddingId>/`, `speeches/`, `compatibility-test-game/`
or `games/` folder when it creates a Doc. Existing folders are reused; nothing is
deleted.

**Doc migration (#969).** The owner panel's *Drive Doc migration · UM paths*
section preflights every existing speech, Test Wiedzy and Test Zgodności Doc,
shows its current and target path, and moves/renames it only after explicit
confirmation. Docs are moved by id, so content, sharing and version history are
preserved. The service account therefore also needs `drive.file` access to move
Docs it created. Missing files, Docs outside the wedding tree, conflicts and
non-UM wedding ids are reported and left untouched. Reruns skip Docs already at
their target path.

**Permission boundary.** Share only `YYYY/Month/<weddingId>/` with the couple.
`secrets/` is its sibling, not a child, so Drive permission inheritance never
grants them speech scripts or Test Zgodności questions. The service account needs
write access to the month folder so it can create `secrets/` when absent.

The app never receives the service account credentials.

---

## 5. Owner admin access

There is no admin self-signup.

1. Create/invite the owner in Supabase Auth.
2. Enable TOTP MFA for the account.
3. Add the user to the allowlist:

```sql
insert into public.app_admins (user_id, email)
values ('<auth-user-id>', '<owner-email>');
```

4. Open `/admin` on a laptop/desktop. Mobile/narrow viewports are blocked.

---

## 6. Verify the setup

Start the app:

```sh
npm run dev
```

Open:

```text
http://localhost:5173/admin
```

Expected:

1. Sign-in screen loads.
2. Email/password sign-in succeeds.
3. TOTP challenge succeeds.
4. Wedding library and Drive folder tree load.
5. No generic `Failed to fetch`.

Useful checks:

- Browser DevTools → Network: look for failing `admin_api` or `admin_drive`
  requests.
- Browser DevTools → Console: check CORS and mixed-content errors.
- Supabase dashboard → Edge Functions: confirm all four functions are deployed.
- Supabase dashboard → Edge Functions → Secrets: confirm required names exist.

### Read-only mode

If the admin backend is unreachable or required secrets are missing, the panel
must enter **read-only mode**:

- read/browse/preview remain available where possible;
- publish, PIN, archive/restore, delete and revoke actions are disabled;
- the server rejects mutations with `admin_read_only`;
- use **Re-check backend** after fixing configuration.

---

## 7. Troubleshooting

### `Failed to fetch`

Usually means the browser could not complete the request.

Check:

- is the Edge Function deployed? (`404` = missing)
- does `ALLOWED_ORIGIN` match the page origin?
- is `VITE_SUPABASE_URL` correct?
- is the device online?
- is an extension/proxy blocking the request?

### `admin_drive is not deployed (404)`

```sh
supabase functions deploy admin_drive
```

### `admin_drive is deployed but the Drive connector is not configured`

Set both Google secrets and redeploy if needed:

```sh
supabase secrets set \
  GOOGLE_SERVICE_ACCOUNT_EMAIL=... \
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=...
```

### `Supabase is not configured for this build`

Create `.env.local`, add `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`, then restart the dev server.

### Admin is read-only

Run the backend preflight again after checking:

- Supabase project status
- `admin_api` and `admin_drive` deployment
- Edge Function secrets
- CORS origin

### 404 on `join_room` or `submit_song_request`

Those functions are not deployed:

```sh
supabase functions deploy join_room
supabase functions deploy submit_song_request
supabase functions deploy get_song_request_status
```

---

## 8. Service health secrets

The admin monitoring bar probes the production deck and the Netlify site
server-side through `service_health`:

```sh
supabase secrets set \
  PUBLIC_DECK_URL=https://deck.weselnyzabojad.pl/ \
  NETLIFY_API_TOKEN=your-read-only-personal-access-token \
  NETLIFY_SITE_ID=your-netlify-site-id
# Optional: NETLIFY_API_BASE=https://api.netlify.com/api/v1
```

`NETLIFY_API_TOKEN` is a read-only personal access token used only by the Edge
Function; it is never exposed through `VITE_*` or the browser. Missing
configuration renders the Netlify card as `down` with an explicit detail.

---

## 9. Secret-handling rules

- Never commit `.env`, `.env.local` or any `.env.*` file.
- Never put secrets behind `VITE_*`.
- Never paste service-role or Google private keys into the browser console,
  issues, pull requests or chat.
- Rotate keys if they are exposed.
- Keep production and local secrets separate.
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` must contain real newlines in the
  runtime secret; use the CLI/dashboard mechanism rather than a committed file.

---

## 10. Related files

- `.env.example` — public template and secret-name reference.
- `project.md` — architecture and product decisions.
- `README.md` — quick start and validation commands.
- `supabase/schema.sql` — database schema and RLS.
- `supabase/migrations/` — migrations.
- `supabase/functions/` — Edge Functions.
