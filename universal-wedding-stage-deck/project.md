# Universal Wedding Stage Deck — Project Status & Roadmap

**Last aligned:** 2026-11-06

**Aligned with:** `master` @ `1ad2448` (merge of issue #76)

**Canonical sources:** this file, [`README.md`](README.md), [`schema/README.md`](schema/README.md), and [`docs/`](docs/).

> This file replaces the previous 14,493-line raw roadmap archive. That archive
> contained duplicated, escaped and partly obsolete blocks (for example the
> Joker Drawer and Kitchen +15m features removed in issue #75). It remains
> available in git history at commit `743eeef`; it is **not** maintained.

---

## 1. Product

An offline-first, multi-device stage deck for a wedding MC and crew:

- one cartridge-driven timeline, shared by the MC tablet, DJ booth, pocket phone,
  photographer and speaker;
- a drift/elastic scheduling engine with hard anchors and buffer advice;
- production room access through per-role 6-digit PINs;
- an owner-only admin surface for the wedding library, PINs, QR cards, presence
  and audit;
- installable PWA with a deferred update prompt (never reloads a live stage
  silently).

Primary deployment path is `/deck/`; the owner surface is `/deck/admin`.

---

## 2. Current status

### Delivered

| Area | Status |
| --- | --- |
| Stage deck views (MC/DJ/Photo/Speaker) | Complete |
| Responsive phone layouts for every role | Decided; implementation issues #109–#114 |
| Drift engine, elastic schedule, buffer accordion, hard-anchor radar | Complete |
| Cake, speeches, key songs, music policy, contacts, photo plan | Complete |
| Offline-first localStorage + optional Supabase sync/outbox | Complete |
| Production per-role PIN join (`join_room` + role JWT) | Complete |
| Deferred PWA update flow (#81) | Complete |
| PWA icons + favicon (#74) | Complete |
| Per-device i18n EN/FR/PL (#78) | Complete |
| Deprecated-feature cleanup (#75) | Complete |
| Owner admin panel `/deck/admin` (#76) | Complete in code; live Supabase smoke test still required |

### Open roadmap issues

| Issue | Item |
| --- | --- |
| [#77](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/77) | WeddingSchema v1.2 freeze and implementation |
| [#79](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/79) | Multi-wedding library and importer safety |
| [#80](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/80) | Cartridge-driven MC cues (remove hardcoded demo cues) |
| [#82](https://github.com/weselnyzabojad/weselny-zabojad-stage-deck/issues/82) | Google Docs-first import (remove the AI-prompt path) |

### Responsive phone / pocket plan

Decision (2026-11-06, confirmed with the owner): remove the separate **Pocket**
role and give every role a classy, phone-first layout on small screens. The full
view remains on laptop/tablet. Work items are tracked as GitHub issues
(P-01–P-06; links added after creation):

- **P-01 / #109** Remove the Pocket role entirely (`pocket` in roles, join
  screen, admin, sessions, RLS, i18n and docs).
- **P-02 / #110** Shared responsive role shell + phone bottom navigation pattern.
- **P-03 / #111** MC phone layout: advance, undo and drift check.
- **P-04 / #112** DJ phone layout (read-only, large cutoff display).
- **P-05 / #113** Photographer phone layout (read-only, shot list).
- **P-06 / #114** Speaker phone layout polish (teleprompter, single column).

---

## 3. Architecture

- **Client:** React 19 + Vite 8 + Tailwind 4, single-page PWA.
- **Offline store:** `localStorage` (`wzsd:v1:*`) for live state, role, theme,
  locale, pending update state and the sync outbox.
- **Cloud (optional):** Supabase Postgres + Realtime + Edge Functions.
- **Auth:**
  - local/demo mode: 4-digit DDMM display PIN and local pairing;
  - production mode: 6-digit per-role PIN validated by `join_room`, returning a
    role-scoped JWT with `wedding_id`, `room_id`, `app_role` and session `jti`;
  - `/deck/admin`: Supabase Auth email/password + TOTP MFA, allowlisted through
    `app_admins`.
- **Routing:** no router library. `main.jsx` selects `/deck/admin` vs the stage
  deck from `window.location.pathname`.
- **Data flow:** cartridge → normalized live state → local persistence →
  optional outbox/Realtime sync. Sensitive notes stay encrypted; only ciphertext
  is synced.

### Main directories

```text
src/
  admin/            owner admin panel, Auth/MFA client, pure admin helpers
  components/       stage UI cards, modals, status and overlay components
  content/games/    prepared optional-game content (not wired into schema yet)
  demo/             demo wedding cartridge
  hooks/            live state, role, theme, pairing, sensitive notes
  i18n/             en/fr/pl dictionaries, t()/tp(), locale persistence
  lib/              drift, clock, schema, import, sync, PWA and data helpers
  views/            MC master view
supabase/
  schema.sql        base tables, RLS, join/wipe/purge functions
  migrations/       owner-admin tables, presence, sessions, audit, RLS updates
  functions/        join_room, publish_room (legacy), admin_api
schema/             WeddingSchema v1.1, fixtures, validators, AI converter prompt
docs/               focused design/testing/accessibility notes
scripts/            validators and migration helpers
tests/              Vitest suites and smoke tests
```

---

## 4. Roles and access

| Role id | Label | Purpose |
| --- | --- | --- |
| `mc` | MC Master | Full deck, drift controls, scripts, VIP radar, stage pings |
| `dj` | DJ Booth | Read-only timeline, playlists, hard cutoffs |
| `photo` | Photographer | Shot lists, sunset windows, Oczepiny cues |
| `speaker` | Speaker | Read-only teleprompter for the assigned speech |

Role choice is per device and never part of the synced live state. In
production the role is fixed by the join token. `/deck/` never lists weddings;
devices join with a room code or a QR deep link, then enter the role PIN.

### Phone layouts (decision, 2026-11-06)

The separate **Pocket** role is removed. Each role keeps one responsive view:
- laptop/tablet shows the full layout;
- small/phone screens get a dedicated pocket layout optimized for one-handed,
  outdoor use (larger touch targets, fewer simultaneous panels, high contrast);
- the **MC phone layout** allows **advance, undo and drift check** only; DJ,
  Photographer and Speaker stay read-only;
- a shared bottom navigation bar keeps the current role and its phone controls
  consistent across views.

Owner admin (`/deck/admin`) remains desktop-first.

---

## 5. Data model

The current schema is **WeddingSchema v1.1**:
[`schema/wedding-schema-v1.1.json`](schema/wedding-schema-v1.1.json).

Core top-level groups:

- identity: `weddingId`, `couple`, `coupleProfile`, `date`, `dateISO`,
  `syncPin`, `role`, `hostingMode`;
- venue and cultural rules: `venue`, `venueLogistics`, `culturalRules`;
- schedule: `hardAnchors`, `steps` (`ELASTIC`, `BUFFER`, `HARD_ANCHOR`);
- content: `cake`, `speeches`, `musicPolicy`, `tact_and_vip_alerts`,
  `preWeddingTodos`, `contacts`, `mediaTeam`, `photoPlan`, `oczepiny`;
- optional/forward-compatible: `demographics`, `viewVisibility`, `privacy`,
  `speeches`, `extensions`;
- live state: `liveSyncState` with `active_step_id`, `completed_step_ids`,
  `actual_timestamps`, `checked_subtasks`, `stage_ping`, `step_order`,
  `active_speech_id`, `mutation_log`.

Validation:

```bash
npm run validate:schema
npm run validate:fixtures
npm run validate:template
npm run validate:i18n
```

`WeddingSchema v1.2` is not frozen yet; tracking issue #77.

---

## 6. Implemented features

### Stage engine and controls

- day-aware drift math across midnight, with a single canonical drift pill;
- ELASTIC/BUFFER/HARD_ANCHOR classification;
- buffer accordion advice for late/ahead drift;
- hard-anchor radar and collision/compression banners;
- swap-with-next with hard-anchor protection and photographer-cue warning;
- undo stack, mutation log, safe advance and end-of-event wipe;
- reel clock, countdowns and cutoff stopwatches.

### Role views

- MC Master: header identity, drift, controls, timeline, cake, music policy,
  buffer accordion, pre-wedding checklist, speeches, radar, stage pings;
- DJ Booth: read-only timeline, key songs and cutoffs;
- Photographer: shot lists, sunset/golden-hour, Oczepiny cues, media team,
  venue access;
- Speaker: assigned-speech teleprompter with cached fallback.

### Content and import

- cartridge importer with Ajv + semantic validation and preview;
- Google Doc template conventions and validator;
- example cartridge, real wedding fixture and edge-case fixtures;
- prepared optional-game content in `src/content/games/` (schema/UI deferred).

### PWA and device UX

- installable PWA with `/deck/` scope;
- icons, favicon and Apple touch icon;
- prompt-based service worker update flow with “Reload now” / “Later”;
- reload guard while a step, speech or overlay is live;
- overlay/scroll restoration after an accepted reload;
- per-device EN/FR/PL UI, persisted locally, separate from cartridge content;
- Night Stage / Daylight themes.

### Owner admin (`/deck/admin`)

- Supabase Auth + TOTP MFA; allowlisted `app_admins`; no self-signup;
- 30-minute idle / 8-hour absolute admin session;
- TOTP re-auth for destructive actions;
- multi-wedding library: publish/create, duplicate, archive, delete;
- per-role 6-digit PINs: auto-generate or owner-edited, bcrypt hashes only,
  shown once, rotate;
- printable QR cards with role deep link, role, room code and event identity —
  never the PIN;
- live presence (role, device, online/idle/offline, last seen, current view,
  token expiry);
- multiple sessions per role, revoke individually; revocation enforced by RLS
  through `current_session_active()`;
- `admin_audit_log`.

### Sync and security

- room key `wzsd:<weddingId>`, never the PIN;
- RLS scoped to the role JWT claims;
- optional outbox with retry;
- sensitive notes encrypted client-side, MC-only ciphertext sync;
- service-role key only in Edge Function secrets;
- TTL purge for expired rooms.

---

## 7. Removed features — do not reintroduce

Removed by issue #75:

- Joker games, `jokersCount`, `jokerGames`, the Joker Drawer defer/restore flow,
  step `deferable`, `deferred_step_ids`;
- kitchen/vendor `+15m` control and `manual_offset_minutes`;
- weather variants/branching (`weatherVariants`, step `weatherOption`);
- step `cateringNotes` and `propsAndFx`;
- related UI, schema fields, fixtures, template columns, AI-prompt sections and
  docs.

The importer strips legacy copies of these fields before validation instead of
migrating them.

---

## 8. Deployment and operations

### Client

```bash
npm ci
npm run dev
npm run build
```

Required public variables:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_DECK_MODE=production   # optional; local mode is the default
```

Never ship the service-role key.

### Supabase

1. Apply [`supabase/schema.sql`](supabase/schema.sql).
2. Apply [`supabase/migrations/202611060001_owner_admin.sql`](supabase/migrations/202611060001_owner_admin.sql).
3. Deploy functions:

```bash
supabase functions deploy join_room
supabase functions deploy publish_room   # legacy x-publish-secret path
supabase functions deploy admin_api
```

4. Set secrets: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`,
   `DECK_PUBLISH_SECRET`, `PUBLIC_DECK_URL`, optional `ALLOWED_ORIGIN`.
5. Add the owner account to `app_admins` and disable Auth self-signup.
6. Build with `VITE_DECK_MODE=production`.

`join_room` now writes `role_sessions` and `role_presence`; existing role tokens
issued before the owner-admin migration have no session row and must rejoin.

---

## 9. Validation

```bash
npm run lint
npm test
npm run build
npm run validate:schema
npm run validate:fixtures
npm run validate:template
npm run validate:i18n
```

CI runs the same checks on pushes and pull requests to `master`.

---

## 10. Known limitations and follow-ups

- Admin panel has not been smoke-tested against the live Supabase project yet.
  First run should cover sign-in → TOTP enrollment → publish → QR join → revoke.
- Admin destructive confirmations and TOTP re-auth currently use native
  `window.prompt` / `window.confirm` dialogs; a proper modal flow is a UI
  improvement candidate.
- i18n covers UI chrome, roles, drift/status labels, errors, PWA, join and
  admin-adjacent components. Cartridge content remains in its authored
  language; some role-view domain strings are still English.
- Optional games content exists but is not in the schema or UI (deferred).
- Google Docs-first import (#82) is not implemented; the manual JSON/AI-prompt
  path remains.
- The Pocket role removal and per-role phone layouts are planned (#109–#114)
  but not implemented yet.
- v1.2 schema freeze (#77), multi-wedding library (#79) and MC cue cleanup
  (#80) remain open.
- `/deck/` static hosting still needs an Apache/SPA rewrite for deep links such
  as `/deck/8f3k2q/mc` and `/deck/admin` (TODO 19).
- No automated browser/axe E2E suite yet.

---

## 11. Source map

| Topic | File(s) |
| --- | --- |
| Product/status | `project.md`, `README.md` |
| Schema/validation | `schema/`, `schema/README.md` |
| Drift/schedule | `src/lib/driftEngine.js`, `src/lib/bufferAccordion.js`, `src/lib/clockMath.js` |
| Live state | `src/lib/liveStageState.js`, `src/hooks/useLiveStageState.js` |
| Role access | `src/lib/roles.js`, `src/lib/sync/roleSession.js`, `supabase/functions/join_room` |
| Owner admin | `src/admin/`, `supabase/functions/admin_api`, `supabase/migrations/` |
| i18n | `src/i18n/`, `scripts/check-i18n.mjs` |
| PWA | `vite.config.js`, `src/components/PwaUpdatePrompt.jsx`, `public/` |
| Importer | `src/lib/cartridgeImporter.js`, `src/components/CartridgeImporter.jsx` |
| Google Doc template | `src/lib/googleDocTemplate.js`, `schema/google-doc-template.md` |
| Tests | `tests/`, `docs/testing.md` |
| Accessibility | `docs/accessibility-audit.md` |
