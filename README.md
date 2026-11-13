# Universal Wedding Stage Deck ("Weselny Żabojad")

Offline-first, multi-device stage deck for a wedding MC, DJ and media crew.
The same cartridge drives the MC tablet, DJ booth, phone/pocket layouts,
photographer/cameraman views, speaker teleprompter and venue-manager panel.

The UI is available in **EN / FR / PL** and is designed for high-contrast,
low-light stage conditions.

---

## Stack

- React 19 + Vite 8
- Tailwind CSS 4
- Vite PWA (installable, offline cache, deferred updates)
- Supabase Postgres + Realtime + Edge Functions (optional cloud sync)
- JSON Schema `WeddingSchema v1.1` cartridges

---

## Quick start

```sh
npm install
npm run dev
```

Production build:

```sh
npm run build
npm run preview
```

The app runs fully offline with `localStorage` when Supabase is not configured.

---

## Environment

Copy `.env.example` to `.env.local` and provide the required values:

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | cloud only | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | cloud only | Public anon key; database access is still gated by RLS |
| `VITE_DECK_MODE` | no | `local` (default) or `production` |
| `VITE_SUPABASE_SYNC_TABLE` | no | Defaults to `live_sync_state` |
| `VITE_SUPABASE_ROOM_PREFIX` | no | Defaults to `wzsd` |

If the Supabase values are missing, the app stays local-only and the sync badge
shows **Local only**.

Validate the local client configuration without printing any secret values:

```sh
npm run validate:env
```

Use `npm run validate:env -- --allow-missing` for a local-only checkout. The
script rejects missing values, malformed URLs, invalid deck modes and any
server secret placed behind a `VITE_*` variable.

Sentry error monitoring is production-only and opt-in through `VITE_SENTRY_DSN`.
Sourcemap upload is a separate build step: set `SENTRY_AUTH_TOKEN`,
`SENTRY_ORG` and `SENTRY_PROJECT` in Netlify's build environment (never
`VITE_*`). With the token, the build emits hidden maps, uploads them and deletes
them from `dist/`; without it, no maps are produced and nothing is uploaded.
The free tier is used conservatively: 10% browser traces and error-only Replay.

Production builds fail closed: a Vite production build defaults to production
deck mode even when `VITE_DECK_MODE` is missing, so demo data is never served by
accident. Only `VITE_DECK_MODE=local` enables the demo deck, and Netlify's
production deploy runs `validate:env -- --require-production` before building.

Server-side Edge Function secrets are documented in `.env.example` and must never
use the `VITE_` prefix. Follow
[`docs/admin-setup-and-secrets.md`](docs/admin-setup-and-secrets.md) for the
complete setup, deployment and troubleshooting path.

---

## Routes

| Route | Surface |
| --- | --- |
| `/` | Public Stage Deck product landing for future newlyweds (no wedding data) |
| `/join` | Crew entry / local pairing or production role join |
| `/<roomCode>/<role>` | Role-scoped production deck |
| `/?room=...&role=...` | Query form of the same deck deep link |
| `/admin` | Owner admin panel (laptop/desktop-oriented) |
| `/request/:roomCode` | Guest song-request page |

The public root presents the Stage Deck product; the deck itself stays private
behind the crew join and per-role PINs, and includes no wedding data. Existing
role QR links keep the `/<roomCode>/<role>` shape.

Roles: `mc`, `dj` (DJ VIP), `dj_standard`, `photo1`, `photo2`, `video`,
`venue_manager`, `speaker`.

### PWA registration

The service worker registers from a route-independent mount in `src/main.jsx`,
so `/`, `/admin` and `/request/:code` install it on their first visit. Updates
remain deferred behind the "Update available" prompt (never a silent reload),
and the manifest stays root-relative (`id`, `scope` and `start_url` are `./`).

---

## Role surfaces

- **MC** — timeline control, advance/undo, scripts, drift, mandatory
  constraints, ceremony briefing, games and music cues.
- **DJ Standard** — minimal read-only timeline and cutoffs; no Music Policy.
- **DJ VIP** — full timeline, Music Policy, main songs, First Dance timing,
  song requests and VIP cues.
- **Photographer 1/2 + Cameraman** — read-only timeline, shot plan, sunset/golden
  hour and children reminder.
- **Venue Manager** — editable mandatory times, kitchen table/buffet modes, cake
  service, closure and extension.
- **Speaker** — assigned speech/script teleprompter.
- **Owner admin** — wedding library, PINs, QR cards, presence, revisions,
  Google Drive preview/publish and audit.

Phone/pocket layouts share the responsive `RoleShell` and the universal timeline
focus stack. Admin is intended for laptop/desktop use; mobile access restriction
is tracked in issue #337.

---

## Schedule model

WeddingSchema v1.1 is canonical:
[`schema/wedding-schema-v1.1.json`](schema/wedding-schema-v1.1.json).

Step types:

| Type | Behaviour |
| --- | --- |
| `FLEXIBLE` | Non-mandatory step; projected start shifts with live drift |
| `HARD_ANCHOR` | Fixed-time obligation; never shifts or swaps |

`BUFFER` and `ELASTIC` were removed. Legacy cartridges must migrate.

Step durations are calculated from the next step's Google Doc time; the final
step runs to the closure time when available. Manual duration overrides are no
longer trusted on import.

### Mandatory constraints

First guests arrival, prestation ready, kitchen services, cake service, closure,
extension, last song and children expected are obligations, not ordinary
timeline cards.

- First guests arrival: **MC + DJ VIP**
- Prestation ready: derived one hour before arrival
- Kitchen services and cake mode: **MC**
- Closure, extension and last song: **MC + DJ VIP**
- Children expected: MC + media

Each kitchen service can be **table service** or **buffet**.

### Ceremony, entrance and dance data

- Ceremony type: `RELIGIOUS`, `CIVIL`, `HUMANIST`, with MC support and
  translation-help flags.
- Grand Entrance order: guests first/newlyweds first.
- First Dance mode: fake/normal, with DJ VIP-only start/stop timing.
- Games can reference one or more question-list Google Docs.

---

## Validation

Run the full suite from the project directory:

```sh
npm run lint
npm run validate:i18n
npm run validate:schema
npm run validate:fixtures
npm run validate:template
npm test
npm run build
```

CI runs the same commands for every pull request against `master` or
`development`.

---

## Cloud sync and security

Cloud sync uses Supabase Realtime and role-scoped JWTs.

- `join_room` validates the per-role 6-digit PIN and returns a JWT carrying
  `wedding_id`, `room_id`, `app_role` and session `jti`.
- RLS policies scope reads/writes to the joined room and role. The schema
  explicitly **revokes anon access** and grants only the minimum required
  columns to `authenticated`.
- The browser anon key is public by design and is not a data-access grant.
- The service-role key stays in Edge Function secrets.
- `/admin` uses Supabase Auth email/password + TOTP MFA and an
  `app_admins` allowlist. There is no self-signup.
- Signed URLs must never be logged.

Apply the SQL in [`supabase/schema.sql`](supabase/schema.sql) and the migrations
in [`supabase/migrations/`](supabase/migrations/) before enabling cloud mode.

---

## Admin Google Drive flow

The owner admin can search shared Drive sources, export Google Docs, preview JSON
cartridges, validate/diff them against the current revision and publish a new
immutable revision after fresh MFA.

Limits:

- no Drive writes, watchers or automatic publication;
- Google Docs are mapped to cartridge drafts; any unmapped displayed field blocks publication;
- every publish re-reads and binds the exact Drive version/text hash;
- restore creates another audited revision.

### Edge Function deployment

Deploy every function the admin and stage roles use:

```sh
supabase functions deploy admin_api
supabase functions deploy admin_drive
supabase functions deploy reveal_speech_key
supabase functions deploy join_room
supabase functions deploy submit_song_request
```

Set server secrets:

```sh
supabase secrets set \
  ALLOWED_ORIGIN=http://localhost:5173 \
  SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  DECK_SUPABASE_JWT_SECRET=... \
  GOOGLE_SERVICE_ACCOUNT_EMAIL=... \
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=... \
  SPEECH_SECRET_MASTER_KEY=...
```

`SPEECH_SECRET_MASTER_KEY` is a 32-byte random value used to derive per-speech
AES-256-GCM keys for redacted speech text. Rotate it only with a re-import of
affected speeches; `keyVersion` in each redaction supports staged rotation.

For production, `ALLOWED_ORIGIN` must be the deployed admin origin, not only
localhost. Verify CORS `OPTIONS` responses and the `admin_drive` `status` action.

If Supabase, `admin_api`, `admin_drive` or required secrets are unavailable, the
admin panel enters **read-only mode** and blocks every mutation until the backend
preflight succeeds again.

### Drive connector setup

1. Enable the **Google Drive API** in Google Cloud.
2. Create a least-privilege service account and share only the wedding
   folder/files with it.
3. Store server-only secrets with `supabase secrets set`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
4. Deploy the `admin_drive` and `admin_api` Edge Functions.
5. Verify revoked sharing, service-account key rotation and token redaction.
6. Run the smoke flow: preview, diff, fresh-MFA publish, offline catch-up and
   restore. No automatic publication may occur.

See [`project.md`](project.md) and [`docs/`](docs/) for the full decisions.

---

## Project documentation

- [`project.md`](project.md) — current status, decisions and roadmap.
- [`docs/admin-setup-and-secrets.md`](docs/admin-setup-and-secrets.md)
  — environment variables, server secrets and full admin deployment setup.
- [`docs/production-release-checklist.md`](docs/production-release-checklist.md)
  — release gates, pre-flight, production smoke checks and rollback. Prepared
  only; do not execute until the owner records GO.
- [`schema/README.md`](schema/README.md) — cartridge schema and fixtures.
- [`docs/google-doc-template-conventions.md`](docs/google-doc-template-conventions.md)
  — Google Doc template parser contract.
- [`docs/testing.md`](docs/testing.md) — test and fixture coverage.
- [`docs/sync-outbox.md`](docs/sync-outbox.md) — offline outbox and retry.
- [`docs/iso-timestamps.md`](docs/iso-timestamps.md) — actual-timestamp handling.
- [`docs/accessibility-audit.md`](docs/accessibility-audit.md) and
  [`docs/phone-layout-plan.md`](docs/phone-layout-plan.md) — UX baselines.

Older plan documents are historical unless they explicitly say otherwise.
