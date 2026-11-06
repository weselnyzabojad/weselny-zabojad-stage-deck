# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

# Universal Wedding Stage Deck ("Weselny Żabojad")

Robust, offline-first PWA event management application built for bilingual/trilingual wedding MCs, DJs, and coordinators (French / Polish / English). 

Designed for high-contrast, low-light stage conditions with a professional French flag color palette (`#002395`, `#FFFFFF`, `#ED2939`) and offline resilience for venues with poor mobile reception.

---

## 🚀 Core Stack
* **Framework:** React 19 + Vite
* **Styling:** Tailwind CSS (v4) with custom typography (Montserrat & Lora)
* **PWA Support:** Vite PWA Plugin (Service Worker & offline caching)
* **Version Control & CI/CD:** GitHub & GitHub Actions

---

## ✨ Key Features
1. **Zero-Scroll Dark Mode Dashboard:** Optimized for Lenovo tablets in landscape mode. Displays cultural hard rules (`Sto Lat`, `Gorzko`, `Bread & Salt`), VIP radar, and live schedule status at a glance.
2. **Dynamic Time-Drift & Elastic Schedule Engine:** Automatically tracks schedule drift (`+25m LATE`, `-15m AHEAD`), recalculates upcoming elastic steps, and protects fixed deadlines (`HARD_ANCHOR` events like sunset photo sessions, videographer departures, or midnight *Oczepiny*).
3. **Multi-Device Cloud Sync & Role Security:** 4-digit room PIN pairing for instant state propagation across devices (Tablet master, DJ booth view, and pocket smartphone clicker) with `localStorage` offline fallback.
4. **Trilingual Script Teleprompter & Cartridge System:** Decoupled architecture where standardized JSON wedding cartridges (`WeddingSchema v1.1`) manage individual wedding schedules, cultural rules, and contact directories.

---

## 🛠️ Project Setup & Local Development

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/universal-wedding-stage-deck.git](https://github.com/your-username/universal-wedding-stage-deck.git)
   cd universal-wedding-stage-deck
   ```

---

## ☁️ Optional Cloud Sync (Supabase)

Issue #6 adds a Supabase Realtime **state listener client**. The app stays
offline-first: if the env vars below are missing, no cloud client is created and
everything runs on `localStorage` + cross-tab `storage` events exactly as before
(the header badge reads **Local only**).

### 1. Create the table + realtime publication

Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. It
creates `public.live_sync_state` (`wedding_id` PK, `pin`, `state` JSONB,
`updated_at`), adds it to `supabase_realtime`, and enables RLS with anon
read/write policies.

### 2. Provide credentials

```bash
cp .env.example .env.local
# then fill in Project Settings -> API -> URL + anon public key
```

| Variable | Required | Default |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | yes | — |
| `VITE_SUPABASE_ANON_KEY` | yes | — |
| `VITE_SUPABASE_SYNC_TABLE` | no | `live_sync_state` |
| `VITE_SUPABASE_ROOM_PREFIX` | no | `wzsd` |

`.env*` files are git-ignored; only `.env.example` is committed.

### 3. How the state listener works

- `src/lib/sync/syncConfig.js` — reads env, returns `enabled: false` when either
  required key is missing (no SDK call is attempted).
- `src/lib/sync/supabaseSyncClient.js` — thin client with `fetchLatest`,
  `publish` (upsert on `wedding_id`), and `subscribe` (Realtime
  `postgres_changes` filtered to the room key).
- `src/hooks/useLiveStageState.js` — hydrates the remote row on mount, adopts
  Realtime payloads through `normalizeLiveState`, debounces local transitions
  (200 ms) before publishing, ignores echoes of its own writes, and lets the
  newest `updated_at` win if the initial fetch races a Realtime event.
- Header badge states: **Local only**, **Connecting…**, **Cloud synced**,
  **Offline**, **Sync error** (hover for the error / last remote update).

### 4. Room PIN pairing (issue #7 / D7)

On first load (or after unpairing) the app renders a full-screen pairing gate
instead of the dashboard:

- Enter the wedding cartridge's 4-digit `syncPin` (e.g. `2008` for
  Jennifer & Guillaume). Digits auto-advance; paste and arrow keys work.
- The PIN is verified **locally**, so pairing works with no connection. It is a
  display/entry gate only.
- The cloud room key is **`wzsd:<weddingId>`**, never the PIN. The pairing
  record is bound to the cartridge `weddingId` under `wzsd:v1:pairing`, so two
  weddings that share a DDMM PIN never inherit each other's state.
- A wrong PIN shakes the field, clears it, and shows an inline error.
- Click the **PIN: 2008 🔓** chip in the dashboard header to unpair this device.
  Timeline progress is not deleted; re-entering the PIN restores it.

Production `/deck/` supersedes this local gate with server-validated per-role
PINs — see section 20.

Relevant files: `src/components/PairingScreen.jsx`, `src/hooks/usePairing.js`,
`src/lib/pairing.js`.

### 5. Role switcher: MC, DJ Booth and Pocket Remote (issue #8)

The header **Role** control switches this device between three views. The
choice is stored per device under `wzsd:v1:role` and is never added to the
synced payload, so one tablet can stay on MC Master while a phone follows the
same room in Pocket Remote.

In production (`VITE_DECK_MODE=production`) the role is fixed by the role token:
there is no free switching. The switcher is hidden and signing out is required
to join with another role's PIN.

| Role | Purpose |
| --- | --- |
| 🎤 **MC Master** | Full deck: trilingual scripts, game clicker, drift, catering sub-tasks, VIP radar and stage pings. |
| 🎧 **DJ Booth** | Read-only companion: projected timeline, playlist/track per step and flashing hard-cutoff timers. No step controls, scripts or family notes. |
| 📱 **Pocket Remote** | Compact phone view for garden/terrace segments: drift, current/next step, script launcher, **Mark done & advance** and **Undo**. |
| 📷 **Photographer** | Shot lists, sunset/golden-hour countdown, Oczepini cues, media-team contacts and venue access/load-in. |
| 🗣️ **Speaker** | Read-only "Speech text — script" teleprompter for the speech the MC has made live. |

`WEDDING.hostingMode` controls the MC surface:

- `HOST_AND_DJ` (default) — DJ cues, stage pings and the DJ Booth role are
  available.
- `HOST_ONLY` — DJ cues and stage pings are hidden and the DJ Booth role is
  removed from the switcher.

`src/lib/timeline.js` builds the projected start/end used by both companion
views: completed/active steps use logged actual times, future steps roll
forward from the previous projected end, planned buffers hold their slot, and
`HARD_ANCHOR` steps stay pinned to their fixed clock time.

Relevant files: `src/lib/roles.js`, `src/hooks/useRole.js`,
`src/components/RoleSwitcher.jsx`, `src/components/DjBoothView.jsx`,
`src/components/PocketRemoteView.jsx`, `src/lib/timeline.js`.

### 6. Silent stage pings (issue #9)

The MC dashboard has four one-tap silent cues:

- **▶️ Drop Track** — start the active step track immediately.
- **🔉 Fade Music** — bring the current track down under an announcement.
- **⏳ Hold 2m** — keep the floor held for two minutes.
- **🎤 Ready** — signal that the MC is ready for the entrance.

Tapping a button writes a small `stage_ping` object (`type`, `sent_at`,
`step_id`) into the same `live_sync_state` payload that carries the timeline.
The DJ Booth listens on the same room channel and flashes a full-width,
high-visibility banner:

- **Drop Track** also shows the active step's track title.
- **Hold 2m** shows a live two-minute countdown.
- Normal pings auto-clear after 25 seconds; Hold stays for the full two
  minutes. Pings older than five minutes are ignored, so a device that
  reconnects late never fires a stale cue mid-ceremony.

The MC card confirms the last ping and its time. When cloud sync is connected
it reports **Cloud synced**; otherwise the ping is saved locally and delivered
when the room reconnects. `HOST_ONLY` hides the ping controls along with the
rest of the DJ surface.

Relevant files: `src/lib/stagePings.js`, `src/components/StagePingControls.jsx`,
`src/components/StagePingBanner.jsx`, `src/lib/liveStageState.js`,
`src/hooks/useLiveStageState.js`.

### 7. Automatic time-drift engine (issue #10)

`src/lib/driftEngine.js` turns the synced live state into a schedule report on
every render:

- Each transition already logs `actual_timestamps[nextStep]`; the engine
  compares that actual start with the step's `planned`/`time` value.
- `currentDriftMinutes` is the newest actual-vs-planned delta, with
  `currentDriftLabel` / `currentDriftTone` helpers. The header, Pocket and DJ
  views instead render `drift.canonicalDriftMinutes` (start/projected drift +
  manual offset), so every surface shows the same number (P0.5). The live
  overrun from the reel clock is a separate metric.
- Every timeline entry also carries `projectedStart`, `projectedEnd`,
  `actualDriftMinutes`, `projectedDriftMinutes` and a drift source, so upcoming
  `ELASTIC` blocks show their realistic start time and projected delay.
- `projectedElasticEntries` (not-yet-done `ELASTIC` blocks),
  `upcomingElasticEntries` (after the active block), `projectedFinish` and
  `projectedFinishDeltaMinutes` expose the rest of the evening in one object.
- Clock deltas are day-aware: `23:50 -> 00:10` is `+20m`, not a 23-hour jump.
  Projection comparisons and durations also roll across midnight.

`buildTimeline` is still exported through `src/lib/timeline.js` for existing
imports; it now returns the enriched entries. The MC header, Pocket drift pill
and DJ timeline drift chips read from the same engine.

`BUFFER` accordion recommendations (issue #11) and `HARD_ANCHOR` collision
warnings (issue #12) are intentionally not part of this engine yet.

Relevant files: `src/lib/driftEngine.js`, `src/lib/timeline.js`,
`src/App.jsx`, `src/components/PocketRemoteView.jsx`,
`src/components/DjBoothView.jsx`.

### 8. BUFFER accordion logic (issue #11)

`BUFFER` steps can declare their flexible range in the cartridge:

```js
buffer: { minDurationMin: 10, maxDurationMin: 60, danceBlock: true }
```

`src/lib/bufferAccordion.js` compares that range with the current drift:

- **Late** — recommends shortening upcoming buffers, in order, until the
  delay is recovered or every buffer reaches `minDurationMin`. It reports the
  recovered minutes and any remaining delay.
- **Ahead** — recommends extending upcoming buffers up to `maxDurationMin` to
  absorb the lead. If the flex is exhausted, it protects the next fixed anchor.
- **On time** — leaves the planned buffer lengths untouched.

`buildDriftReport` exposes the plan as `bufferAccordion` and also returns
`accordionEntries` / `accordionProjectedFinish`, which project the recommended
durations without mutating the original cartridge. The MC dashboard shows the
recommendation in the **🪗 Buffer Accordion** card, including per-buffer
`30 → 10 min` changes and recovered minutes. Applying the recommended duration
with a one-tap control belongs to issue #13.

The demo cartridge marks *Buffets Open & Dance Floor* as a 30-minute dance
buffer with a 10–60 minute range, so the card reacts to late and ahead drift.

Relevant files: `src/lib/bufferAccordion.js`, `src/lib/driftEngine.js`,
`src/components/BufferAccordionCard.jsx`, `src/App.jsx`.

### 9. HARD_ANCHOR protection radar (issue #12)

Fixed deadlines live in the cartridge as `hardAnchors`:

```js
hardAnchors: [
  { time: '20:30', label: 'Photo / Video Leaves', alertBeforeMin: 45 },
  { time: '00:00', label: 'Oczepiny (Exact)', alertBeforeMin: 30 },
]
```

`src/lib/hardAnchorRadar.js` finds the last projected block before each anchor
and compares its projected end with the anchor time:

- **Collision** — projected work overruns the anchor. A red MC banner appears
  with the overrun and the blocking step.
- **Compression / WATCH** — work leaves 10 minutes or less of slack. An amber
  banner appears and advises swapping a block.
- **Approaching** — the anchor is inside its `alertBeforeMin` window but still
  has healthy slack; it appears as a cyan notice in the radar.
- **Safe** — the anchor has comfortable slack.

The MC dashboard now renders the dynamic **🚨 Hard Anchor Radar** card with
every anchor's work-end, slack/overrun and status, plus the full-width
**⏰ Hard anchor collision / compression** banner when action is needed. The
warning is advisory; the one-tap recovery actions are issue #13.

Clock math is shared through `src/lib/clockMath.js` so the drift engine and
radar use the same day-aware midnight handling.

Relevant files: `src/lib/hardAnchorRadar.js`, `src/lib/clockMath.js`,
`src/lib/driftEngine.js`, `src/components/HardAnchorRadar.jsx`,
`src/components/HardAnchorAlertBanner.jsx`, `src/App.jsx`.

### 10. One-tap on-stage controls (issue #13)

The MC footer has one live control backed by the synced live state:

- **🔀 Swap w/ Next** — swaps the active block with the next block in
  `step_order`, moves the active marker to the swapped-in block, and keeps
  advance/undo working in the new order.

The control updates the same `live_sync_state` payload used by cloud sync and
offline storage, so the DJ Booth and Pocket Remote see the shifted order
immediately.

Relevant files: `src/lib/liveStageState.js`,
`src/hooks/useLiveStageState.js`, `src/App.jsx`.

### 11. WeddingSchema v1.1 specification (issue #14)

The portable cartridge format is now defined in `schema/`:

- `schema/wedding-schema-v1.1.json` — Draft 2020-12 JSON Schema.
- `schema/wedding-cartridge.example.json` — complete demo cartridge.
- `schema/validate-cartridge.mjs` — structural validation plus cross-field
  checks (unique IDs, live-state references, buffer bounds, VIP counts).
- `schema/README.md` — field reference, step types, teleprompter shapes,
  hard anchors, live-state defaults and versioning rules.

Run:

```bash
npm run validate:schema
npm run validate:schema -- path/to/cartridge.json
```

The schema uses the app's canonical camelCase shape (`weddingId`, `syncPin`,
`hostingMode`, `hardAnchors`, `durationMin`, `buffer`, `step_order`) and
rejects unknown top-level keys; use `extensions` for forward-compatible extras. Legacy snake_case Google
Docs imports will be mapped by the issue #15 importer.

### 12. AI converter prompt and in-app importer (issue #15)

The ingestion pipeline is now wired end-to-end:

- `schema/ai-converter-prompt.md` is the copy-paste AI prompt. It defines the
  exact v1.1 shape, ELASTIC/BUFFER/HARD_ANCHOR classification, buffer ranges,
  hard anchors, teleprompter shapes and pre-wedding task extraction.
- **Import** is available from the pairing screen (so a different wedding can
  be loaded before entering its PIN) and from the MC header.
- The importer combines the prompt with an optional raw-notes textarea, lets
  you paste the generated JSON, validates it in the browser with the same Ajv
  schema + semantic checks as the CLI, previews the cartridge and then imports.
- Importing saves to `wzsd:v1:cartridge` and reloads the app. If the new
  cartridge uses a different `syncPin`, the pairing gate appears for the new
  wedding. **Reset to built-in demo** clears the imported cartridge.
- `preWeddingTodos` from the cartridge render in the MC **🧳 Pre-Wedding
  Checklist** card; check states use the synced `checked_subtasks` map.
- Ajv is loaded on demand, keeping the main bundle lean while still validating
  offline after the PWA caches the importer chunk.

Relevant files: `schema/ai-converter-prompt.md`,
`src/components/CartridgeImporter.jsx`, `src/components/PreWeddingChecklistCard.jsx`,
`src/lib/cartridgeImporter.js`, `src/lib/cartridgeValidation.js`,
`src/lib/cartridgeStorage.js`, `src/App.jsx`.

### 13. Retired: Co-Hosting & Content Creator module (D10 / TODO 20)

The Issue #16 module was removed on 2026-11-03 (decision D10):

- `src/components/TeamModule.jsx` is deleted; the MC header no longer has a
  **Team (N)** button.
- Demo `coHosts`/`contentCreators` data, the importer preview counts and the
  duplicate-ID validator checks are gone.
- `WeddingSchema v1.1` keeps the `coHosts` / `contentCreators` definitions so
  existing cartridges still validate, but they are marked legacy and the
  importer **drops both arrays** when a cartridge is stored. The AI converter
  prompt no longer asks for them.
- Use `contacts` for the vendor directory instead.

### 14. DJ Key Songs card: VIP vs Standard (issue #60 / TODO 18)

The DJ Booth now pins a **🔑 Key songs** card above the projected timeline for
the moments that must not be missed: grand entrance, cake cutting and first
dance (plus optional parents/last dance/custom moments). Each row shows a
DONE / ON AIR / NEXT / PLANNED state linked to its timeline step through
`stepId`.

The cartridge supplies the data in `musicPolicy.importantSongs[]`:

```json
"musicPolicy": {
  "importantSongs": [
    {
      "id": "grand_entrance",
      "moment": "GRAND_ENTRANCE",
      "title": "Marry You",
      "artist": "Bruno Mars",
      "version": "Album version",
      "stepId": "step_03",
      "plannedTime": "18:00",
      "startAtSec": 0,
      "fadeOutSec": 215,
      "source": {
        "type": "CUSTOMER_FILE",
        "fileRef": "assets/audio/marry-you.mp3",
        "filename": "marry-you.mp3",
        "checksum": "sha256:...",
        "durationSec": 230,
        "availability": "LOCAL"
      },
      "backupSource": { "type": "SPOTIFY", "url": "https://open.spotify.com/track/..." },
      "note": "Wait for the MC cue before pressing play."
    }
  ]
}
```

- `servicePackage: "HOST_AND_DJ_VIP"` renders the VIP detail level: the
  source/root badge (customer file, YouTube, Spotify, Deezer or other), file
  name/checksum/duration/availability or link actions, start/fade cues, the
  backup source and a VIP-only mini QR at the right edge of each row.
- `HOST_AND_DJ_STANDARD` and `HOST_AND_DJ_SOLO` render title + artist only —
  never a source, cue, link or QR. Missing values show `Title TBC` /
  `Artist TBC`.
- v1.1 cartridges keep working: `hostingMode: "HOST_AND_DJ"` maps to the VIP
  package (the v1.2 migration rule).
- The QR is generated locally from the stored link (the `qrcode` encoder is
  loaded on demand and precached by the PWA). Tapping the mini QR opens a
  large, non-auto-dismissing overlay with **Copy link** and **Close**.
  Streaming sources show "opens online"; customer files show a QR only when
  they have a stable, intentionally shared HTTPS URL, otherwise "QR
  unavailable for protected file".
- `viewVisibility.dj.music: false` hides the whole card. The card is driven by
  the service package and visibility matrix, not by role switching.
- The Google Doc `## IMPORTANT SONGS` section maps to this block; see
  `schema/ai-converter-prompt.md`. Links are preserved exactly and never
  invented; missing sources warn instead of blocking the import.

Relevant files: `src/lib/importantSongs.js`,
`src/components/KeySongsCard.jsx`, `src/components/QrCodeImage.jsx`,
`src/components/DjBoothView.jsx`, `src/App.jsx`,
`schema/wedding-schema-v1.1.json`, `schema/ai-converter-prompt.md`,
`src/lib/cartridgeValidation.js`.

### 15. Real-time reel clock (issue #42 / P0.6)

Drift used to be recomputed only on renders and step transitions, so a step
never showed a live overrun. The deck now runs **one shared ticking clock**:

- `src/hooks/useEventClock.js` ticks once per second and applies a server-time
  offset. It is instantiated once in `App.jsx` and passed to every view.
- `buildDriftReport(..., { now })` is recomputed on every tick, so overruns,
  anchor countdowns and DJ cutoffs update without waiting for a transition.
- `src/components/ReelClock.jsx` renders the clock:
  - **MC Master** — large card: current time (venue timezone), active step,
    elapsed, remaining / overrun, projected finish, next hard-anchor countdown,
    DJ cutoff countdown and a clock-skew warning.
  - **DJ Booth / Pocket Remote** — compact version with the same live values.
- DJ cutoff countdown uses the active step's absolute `dj.cutoff` when set,
  otherwise `actual start + dj.cutoffSec`.
- Clock skew is measured with the Supabase `stage_deck_server_time()` RPC. A
  device more than ~30 seconds off the server shows a warning. Without cloud
  sync the warning stays hidden (there is no authoritative clock to compare).
- Time formatting uses `Intl.DateTimeFormat` with the venue timezone
  (`venueLogistics.timezone`, falling back to the device timezone).

**ISO timestamps (TODO 23).** Actual step starts are now stored as full ISO
datetimes internally (`actual_timestamps`); `HH:MM` is derived for display in
the venue timezone. The drift engine compares absolute instants, so a step that
crosses midnight no longer hits the old ±12h fold limit. Legacy v1.1 cartridges
that store bare `HH:MM` still load: `normalizeActualTimestamp` migrates them on
load against the event date + timezone. The JSON Schema accepts both forms.

After pulling this change, re-run [`supabase/schema.sql`](supabase/schema.sql)
to create the `stage_deck_server_time()` function and the `updated_at` trigger.

Relevant files: `src/lib/eventTime.js`, `src/lib/reelClock.js`,
`src/lib/driftEngine.js`, `src/lib/liveStageState.js`,
`src/hooks/useEventClock.js`, `src/hooks/useLiveStageState.js`,
`src/components/ReelClock.jsx`, `src/App.jsx`,
`src/lib/sync/supabaseSyncClient.js`, `supabase/schema.sql`,
`schema/wedding-schema-v1.1.json`.

### 16. Couple identity in the top bar (issue #58 / TODO 15)

The MC, DJ Booth and Pocket headers now render the cartridge-driven
`coupleProfile` instead of a hardcoded label:

```json
"couple": "Jennifer & Guillaume",
"coupleProfile": {
  "bride": { "firstName": "Jennifer", "nationalities": ["FR"] },
  "groom": { "firstName": "Guillaume", "nationalities": ["FR"] },
  "commonLanguages": ["FR", "PL", "EN"]
}
```

- Layout: `Jennifer 🇫🇷 & Guillaume 🇫🇷 · 🌐 FR PL EN` (bride first, cartridge
  order). Flags are 24×18 px, 4:3, rounded with a thin border; up to two per
  person with `+N` for extra nationalities.
- Flags are **self-hosted SVGs** from the `flag-icons` package, bundled by Vite
  so the header works offline with no third-party request or API key.
- Language chips are uppercase ISO 639-1 codes with a globe icon; the full name
  is in the tooltip via `Intl.DisplayNames` (device browser locale, until the
  per-device i18n layer lands). Chips collapse below `sm`; flags stay visible.
- Flags are `aria-hidden`; a screen-reader suffix reads the localized country
  names. Unknown/invalid codes render as plain text instead of a guessed flag.
- Fallback order: `coupleProfile` -> legacy `couple` string -> "Wedding".
  v1.1 cartridges therefore keep the old `Wedding: {couple}` label.
- The importer preview shows the parsed first names, flags and shared
  languages before saving.

**Google Doc parser:** the `## COUPLE IDENTITY` section maps to `coupleProfile`
(see `schema/ai-converter-prompt.md`). Nationality names are normalized to ISO
3166-1 alpha-2 (`French`/`France`/`Français`/`Francja` -> `FR`, `Polish`/`Poland`/
`Polonais`/`Pologne`/`Polska` -> `PL`). Nationality is never inferred from a
name, birthplace or spoken language, and `commonLanguages` is never derived from
`languages.supported`. If the section is missing, the legacy `couple` string may
be split on `&` only as an unconfirmed prefill.

Relevant files: `src/components/CoupleIdentity.jsx`, `src/lib/coupleIdentity.js`,
`src/lib/flags.js`, `src/App.jsx`, `src/components/DjBoothView.jsx`,
`src/components/PocketRemoteView.jsx`, `src/components/CartridgeImporter.jsx`,
`schema/wedding-schema-v1.1.json`, `schema/ai-converter-prompt.md`,
`schema/wedding-cartridge.example.json`, `vite.config.js`.

### 17. Cake protocol (issue #49 / TODO 6)

The cartridge can now describe the cake moment as a first-class block:

```json
"cake": {
  "time": "20:30",
  "cuttingSong": "Cake - The Coup",
  "sparklers": true,
  "photographerCue": "Front-left of the cake table",
  "serveTime": "20:45"
}
```

- The MC dashboard shows a **🎂 Cake protocol** card (cutting time, serve time,
  cutting song, sparklers, photographer cue) with a DONE / ON AIR / NEXT /
  PLANNED state linked to the cake step. Pocket Remote gets a compact version.
- The song is kept in sync with `musicPolicy.importantSongs[]` (TODO 18): when
  a `CAKE` entry exists, its title/artist is the single source of truth for
  both the Cake card and the DJ Key Songs card. `cake.cuttingSong` is only the
  legacy/display fallback. A conflicting `cuttingSong` is surfaced in the card
  and never wins.
- If `cake.time` is missing, the CAKE key song's `plannedTime` is used. Missing
  sparklers/cue/serve time render as `—`; nothing is inferred.
- Validation: `cake.serveTime` cannot be before `cake.time`. The importer
  preview shows the cake cutting and serve times.
- The AI converter prompt maps a Google Doc `## CAKE` section to this block and
  tells the AI to reuse the CAKE row from `musicPolicy.importantSongs[]`.

Relevant files: `src/lib/cake.js`, `src/components/CakeCard.jsx`, `src/App.jsx`,
`src/components/PocketRemoteView.jsx`, `src/lib/cartridgeValidation.js`,
`src/lib/cartridgeImporter.js`, `src/components/CartridgeImporter.jsx`,
`schema/wedding-schema-v1.1.json`, `schema/ai-converter-prompt.md`,
`schema/wedding-cartridge.example.json`.

### 18. Vendor contacts directory (issue #53 / TODO 10)

The MC header now exposes **📇 Contacts (N)**, opening a structured vendor
directory:

```json
"contacts": [
  {
    "id": "photo_video",
    "role": "Photo / Video",
    "name": "Magda & Tomek",
    "phone": "+48 600 000 000",
    "email": "photo@studio.example",
    "leavesAt": "20:30",
    "notes": "Group photo before 20:15; leaves at the photo/video anchor."
  }
]
```

- Phone numbers render as `tel:` buttons (spaces, dashes and brackets stripped,
  leading `+` kept) and emails as `mailto:` buttons. Invalid values stay visible
  as plain text instead of becoming broken links.
- `leavesAt` is matched by time to a `hardAnchors[]` entry. A matched departure
  shows the anchor label and a **show anchor** action that closes the modal and
  scrolls to that row in the Hard Anchor Radar. An unmatched `leavesAt` shows a
  warning so the departure can be protected with an anchor.
- The schema now allows `contacts[].id`, `email` and `leavesAt`; duplicate
  contact ids are rejected on import. v1.1 cartridges without those fields still
  load.
- The importer preview shows the contact count and how many have departures.
- The AI converter prompt maps a Google Doc `## VENDOR CONTACTS` section to this
  block and tells the AI never to invent phone numbers or emails.

Relevant files: `src/lib/contacts.js`, `src/components/ContactsModal.jsx`,
`src/components/HardAnchorRadar.jsx`, `src/App.jsx`,
`src/lib/cartridgeValidation.js`, `src/lib/cartridgeImporter.js`,
`src/components/CartridgeImporter.jsx`, `schema/wedding-schema-v1.1.json`,
`schema/ai-converter-prompt.md`, `schema/wedding-cartridge.example.json`.

### 19. Music policy: requests, blacklist and licensing (issue #45 / TODO 2)

The cartridge now carries the full guest-music policy:

```json
"musicPolicy": {
  "mustPlay": [{ "id": "first_dance", "track": "Perfect - Ed Sheeran", "note": "Duet version." }],
  "doNotPlay": [{ "id": "no_macarena", "track": "Macarena - Los del Río", "reason": "Couple's request." }],
  "requestsOpen": true,
  "requestWindow": { "start": "20:00", "end": "23:00" },
  "cleanVersions": true,
  "licensing": "Venue ZAIKS license confirmed."
}
```

- The **DJ Booth** renders the full **🎵 Music policy** card in the sidebar:
  must-play and do-not-play lists with notes/reasons, the live request-window
  state, clean-version policy and licensing note.
- **MC Master** and **Pocket Remote** get a compact card with the request
  state, list counts, clean-version policy and the blacklist.
- The request window is evaluated against the shared reel clock and venue
  timezone: `Opens 20:00 in 25:00`, `Open until 23:00 · 45:00 left`, `Closed at
  23:00`, or `Requests closed` when `requestsOpen` is `false`.
- `mustPlay` entries that reuse an `importantSongs[].id` are linked to the DJ
  Key Songs card: the Key Songs title wins and a differing stored `track` is
  flagged (never two conflicting first-dance titles).
- Validation rejects duplicate must-play/do-not-play ids and a
  `requestWindow.end` that is not after `start`. The importer preview shows the
  must-play / do-not-play counts and clean-version flag.
- The AI converter prompt maps `## MUSIC POLICY` / `## GUEST REQUESTS` to this
  block and forbids inventing songs, reasons or licensing details.

Relevant files: `src/lib/musicPolicy.js`, `src/components/MusicPolicyCard.jsx`,
`src/components/DjBoothView.jsx`, `src/components/PocketRemoteView.jsx`,
`src/App.jsx`, `src/lib/cartridgeValidation.js`,
`src/lib/cartridgeImporter.js`, `src/components/CartridgeImporter.jsx`,
`schema/wedding-schema-v1.1.json`, `schema/ai-converter-prompt.md`,
`schema/wedding-cartridge.example.json`.

### 20. Room identity and production role PINs (issue #38 / P0.2)

**D7 room key.** The cloud room is now keyed by **`wzsd:<weddingId>`**, not the
PIN. `App.jsx` passes `roomId: WEDDING.weddingId`; the DDMM `syncPin` stays a
local/display gate only. Two weddings on the same date — or with the same DDMM
PIN — no longer collide or inherit each other's state. The pairing record is
bound to the `weddingId`, and legacy PIN-only records are treated as unpaired.
The importer warns when a new cartridge reuses the current cartridge's display
PIN.

**Production per-role PINs (`VITE_DECK_MODE=production`).**
- The `/deck/` gate is `RoleJoinScreen`: room code + role (`mc`, `dj`, `pocket`,
  `photo`, `speaker`) + a **6-digit role PIN**. No couple names or cartridge data
  are rendered before the server returns a token.
- The client calls the `join_room` Edge Function. The server validates a bcrypt
  hash from `wedding_roles`, rate-limits to **5 failures per room/role/IP per
  15 minutes**, and returns a 24-hour JWT with
  `{ wedding_id, room_id, app_role }`. Supabase's reserved `role` claim stays
  `authenticated`; the device role is `app_role`.
- After joining, the client fetches the role-scoped cartridge from `weddings`
  (RLS only returns the matching row), caches it locally and reloads. Production
  never falls back to the demo wedding.
- The token is cached in `localStorage` (`wzsd:v1:role-session`) so a joined
  device keeps working offline until expiry. The sync client sends it as a
  bearer token to PostgREST and Realtime.
- The token fixes the device to one role: the role switcher is hidden, and
  signing out (the header role chip) is required to join with another PIN.

**Server setup**
1. Run [`supabase/schema.sql`](supabase/schema.sql): creates `weddings`,
   `wedding_roles`, `join_attempts`, removes the plaintext `pin` column and
   replaces the permissive policies with claim-scoped RLS.
2. Apply [`supabase/migrations/202611060001_owner_admin.sql`](supabase/migrations/202611060001_owner_admin.sql):
   adds `app_admins`, the audit log, per-device `role_sessions` /
   `role_presence`, and enforces revoked sessions in RLS.
3. Deploy the functions: `supabase functions deploy join_room`,
   `supabase functions deploy publish_room` and
   `supabase functions deploy admin_api`.
4. Set secrets: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`,
   `DECK_PUBLISH_SECRET`, and optionally `PUBLIC_DECK_URL` / `ALLOWED_ORIGIN`.
5. Insert the owner account into `app_admins` (no self-signup):
   `insert into public.app_admins (user_id, email) select id, email from auth.users where email = 'owner@example.com';`
6. Build the client with `VITE_DECK_MODE=production` and the Supabase URL/anon
   key. Never ship the service-role key.

**Owner admin (`/deck/admin`)**
- Supabase Auth email/password + verified TOTP MFA. The account must exist in
  `app_admins`; sign-up is disabled.
- Create/publish, duplicate, archive and delete weddings; rotate per-role
  6-digit PINs (shown once, hashed server-side); print QR cards that contain the
  role deep link but never the PIN.
- Live presence and per-session revoke; revoked sessions stop working
  immediately through `current_session_active()` in RLS.
- 30-minute idle / 8-hour absolute session plus TOTP re-auth for destructive
  actions; every mutation is written to `admin_audit_log`.
- `/deck/` never lists weddings; devices join with a room code or QR link.

**Local admin preview (dev only, no backend)**
- Set `VITE_ADMIN_DEMO=1` in `.env.local` (already set for local development) and
  run `npm run dev`.
- Open `http://localhost:5173/deck/admin` to see the admin UI with sample data.
- The preview never contacts Supabase; mutations are disabled and a banner says
  so. `import.meta.env.DEV` guards it, so production builds exclude the demo
  module entirely.
- Remove `VITE_ADMIN_DEMO` (or set it to `0`) to use the real Supabase login.

Local/demo mode still runs entirely offline (localStorage + cross-tab events).
If a local-mode build is pointed at the hardened schema, cloud sync is denied
because there is no role token — use `VITE_DECK_MODE=production` for cloud
rooms.

Relevant files: `src/App.jsx`, `src/lib/pairing.js`, `src/hooks/usePairing.js`,
`src/lib/sync/syncConfig.js`, `src/lib/sync/roleSession.js`,
`src/lib/sync/joinRoom.js`, `src/components/RoleJoinScreen.jsx`,
`src/lib/sync/supabaseSyncClient.js`, `src/hooks/useLiveStageState.js`,
`src/components/CartridgeImporter.jsx`, `supabase/schema.sql`,
`supabase/functions/join_room/index.ts`,
`supabase/functions/publish_room/index.ts`.

### 21. Night Stage / Daylight theming (issue #69 / TODO 27)

The deck now has a token-based, per-device theme on the same France/Poland
blue-white-red identity:

- **Night Stage** (default) is the original deep-navy palette, so the token
  refactor is visually identical to the previous build.
- **Daylight** is a white/ivory canvas with navy text for outdoor glare. The
  French blue and Polish red accents are unchanged; only surfaces and text flip.
- Theme is stored per device under `wzsd:v1:theme`; it is **never synced**, so
  the MC tablet can stay dark while the Pocket phone runs Daylight.
- The initial value follows `prefers-color-scheme`; an explicit toggle wins and
  is persisted. `index.html` applies the stored theme before first paint so the
  canvas never flashes the wrong theme.
- A sun/moon **theme toggle** sits in the MC, DJ Booth and Pocket headers, and
  on the pairing/join screens. It is keyboard- and screen-reader accessible
  (`aria-pressed`, translated label).
- `useTheme`/`lib/theme.js` update `data-theme` on `<html>`, `color-scheme`,
  and the `<meta name="theme-color">` value (`#070b19` Night, `#eef2f7` Day).
- Tokens live in `src/index.css`: `--bg-page`, `--bg-card`, `--bg-raised`,
  `--border`, `--border-strong`, `--text-primary`, `--brand*`, `--alert*`.
  Tailwind utilities (`bg-page`, `bg-card`, `border-line`, `text-brand-soft`,
  `text-alert-tint`, ...) resolve through them.
- The existing views were migrated mechanically from the old hexes to the
  tokens (dark values unchanged). `text-white` keeps a Daylight bridge to navy
  except on solid blue/red surfaces; the remaining `text-slate-*` utilities use
  a mirrored neutral scale. Full per-view refinement continues with the
  App.jsx split (TODO 22).
- Status colours stay explicit and are never colour-only; the red stage-ping
  banner keeps white text in both themes.

Relevant files: `src/index.css`, `index.html`, `src/lib/theme.js`,
`src/hooks/useTheme.js`, `src/components/ThemeToggle.jsx`, `src/App.jsx`,
`src/components/DjBoothView.jsx`, `src/components/PocketRemoteView.jsx`,
`src/components/PairingScreen.jsx`, `src/components/RoleJoinScreen.jsx`.

### 22. Photographer view and DJ detail tiers (issue #69 / TODO 21)

**Photo role.** The `photo` role is now a first-class device view (D2), offered
by the role switcher and the `/deck/` join screen. It is never hidden by the
service package (`HOST_ONLY` only removes the DJ role).

`PhotographerView` is driven by `viewVisibility.photo` (v1.2 defaults, merged
with cartridge overrides) and renders:

- a shared compact reel clock plus the read-only timeline;
- **sunset / golden hour** with `LIVE` / `STALE` / `UNAVAILABLE` status,
  countdowns, and the mini-session latest-start timer. D6 is respected: a
  missing/unavailable value shows “Sunset unavailable — check connection” and is
  never estimated offline; stale values are explicitly marked;
- **Oczepini cues**: anchor countdown, toss/ties, winner-photo cue, briefed
  status, sub-events, props and music, plus a warning when every media-team
  member leaves before the Oczepini anchor;
- **photo plan**: mini session, group photos (groups + minimum size), speed
  foto, special effects (permit/approval/briefing) and guest coverage;
- **media team** contacts with `tel:` links, call windows and departures;
- **venue access**: address, Maps link, manager call, installation window,
  load-in, access notes and parking.

Data blocks `mediaTeam`, `photoPlan`, `oczepiny` and `venueLogistics` (plus
`viewVisibility`) are now optional v1.1 schema fields. Validation enforces
unique media IDs, an anchor for midnight Oczepini, fire-effect permit/approval/
briefing, and coordinates for an enabled mini session.

**DJ detail tiers.** `DjBoothView` now makes the service package explicit:

- a **VIP / STANDARD / SOLO** badge in the header;
- **VIP** unlocks playlist, notes and full cue detail, the Key Songs
  source/root + mini QR, and a VIP-only **Copy set list** control;
- **Standard** shows the essentials (track titles, basic timeline, cutoffs,
  title + artist key songs);
- **Solo** shows a “combined host + DJ” banner and keeps the Standard song
  detail level (the MC view carries scripts and drift controls).

The `speaker` role is now implemented — see section 25.

Relevant files: `src/lib/roles.js`, `src/components/PhotographerView.jsx`,
`src/lib/photoPlan.js`, `src/components/DjBoothView.jsx`, `src/App.jsx`,
`src/components/RoleJoinScreen.jsx`, `schema/wedding-schema-v1.1.json`,
`src/lib/cartridgeValidation.js`, `schema/wedding-cartridge.example.json`.

### 23. Encrypted sensitive notes, role RLS and TTL/delete (issue #44 / TODO 1)

This completes the D4 privacy layer on top of the D7 room/role work in section
20.

**Encrypted sensitive notes (host-held key).**
- VIP/family alerts and the vendor contact list are collected into a sensitive
  payload and encrypted client-side with **WebCrypto AES-GCM (256-bit)** before
  upload. Cloud rows contain only `{ v, alg, iv, ciphertext }`.
- The random host key is generated on the MC device and stored under
  `wzsd:v1:host-key`. It is never written to the cartridge, sync payload, logs,
  URLs or Supabase. Non-MC devices never receive it.
- Encrypted bundles live in `sensitive_notes`, readable only by the `mc` role
  for its own room. The published cartridge is **redacted** server-side
  (`publish_room` strips `vipAlerts`/`contacts`), so plaintext never reaches the
  cloud.
- The MC loads and decrypts the bundle at runtime; the VIP Radar and Contacts
  directory then use the decrypted data. If the bundle exists but this device
  has no host key, the view shows a locked state.
- Recovery/handoff: the **Event data** card (MC only) can copy the host key to
  another host device, import a key, export the cartridge, and wipe the event.

**Role-scoped RLS.**
- `live_sync_state`: reads for any joined role in its room; inserts/updates only
  for `app_role IN ('mc', 'pocket')`. DJ and Photo are read-only at the database
  level.
- `sensitive_notes`: `mc` only, matching `wedding_id`.
- `weddings`: any joined role in its room. `wedding_roles`/`join_attempts` remain
  service-role only.

**TTL / delete.**
- `weddings.expires_at` is set by `publish_room` from the **event date plus a
  grace period** (default 7 days; configurable with `expiresInDays`, 1–365).
  Without an event date it falls back to 30 days from publish time.
- `join_room` rejects an expired room with HTTP 410.
- `stage_deck_purge_expired()` deletes expired rooms (state, wedding, roles,
  notes), orphaned room state and old `join_attempts`. Schedule it daily with
  pg_cron (commented example in `schema.sql`).
- `stage_deck_wipe_my_room()` lets the MC token wipe its own room immediately;
  the **Event data** card calls it and then clears the local cartridge, pairing,
  role session and host key.
- The service-role `stage_deck_wipe_room(wedding_id)` remains for admin use.

After pulling this change, re-run [`supabase/schema.sql`](supabase/schema.sql)
and redeploy `publish_room` (it now redacts sensitive fields and sets
`expires_at`).

Relevant files: `src/lib/sensitiveNotes.js`,
`src/hooks/useSensitiveNotes.js`, `src/components/EventAdminCard.jsx`,
`src/App.jsx`, `src/lib/sync/supabaseSyncClient.js`, `supabase/schema.sql`,
`supabase/functions/publish_room/index.ts`.

### 24. One canonical drift value (issue #41 / P0.5)

Drift used to disagree: the header showed the raw actual-vs-planned sample
(excluding the manual offset) while the buffer accordion used the offset-adjusted
value. The same schedule could read `ON TIME` in the header and `+15m LATE` in
the buffer advice.

`buildDriftReport` now exposes one canonical value used by every surface:

- `startDriftMinutes` — newest actual start vs planned start.
- `projectedDriftMinutes` — projected start vs planned.
- `liveOverrunMinutes` — now vs the projected end of the active step (live clock).
- **`canonicalDriftMinutes` = the newest actual start drift**, with
  `canonicalDriftLabel`, `canonicalDriftTone`, `canonicalDriftSource` and a
  `detail` string for the tooltip.

The header pill, Pocket drift bar and DJ header now render the same
`DriftPill` from `driftReport.drift`. The buffer accordion is fed the same
canonical value. The live overrun stays a separate reel-clock metric and is
explained in the pill tooltip, never as a competing headline number.

`currentDriftMinutes` / `currentDriftLabel` remain as the raw start-drift
components for backward compatibility, but no view renders them.

Relevant files: `src/lib/driftEngine.js`, `src/components/DriftPill.jsx`,
`src/App.jsx`, `src/components/PocketRemoteView.jsx`,
`src/components/DjBoothView.jsx`, `src/lib/bufferAccordion.js`.

### 25. Speeches and the Speaker role (issue #72 / TODO 8)

The speeches module is finalised for the v1.1 cartridge.

**Data**
- `speechMode: OFF | LIGHT | COMPLEX` at the wedding level, with per-speech
  `mode` overrides.
- `speeches[]` records speaker name/relationship/contact, order, time, duration,
  language, mic, cue, delivery (`READ`/`MEMORIZE`/`NOTES`), `readFrom`
  (`PHONE`/`TABLET`/`PAPER`/`MEMORY`/`OTHER`), MC-intro flag, `visibleToRoles`,
  `consent`, `teleprompterRef` and `script: { text, format, ready, source }`.
- Script text is stored **verbatim** (paragraph breaks preserved). A missing
  COMPLEX script warns and remains editable; it never blocks the import.
- Consent defaults to granted for older records; `consent.storeScript: false`
  locks the script on the speaker device.
- Validation rejects duplicate speech IDs/order and an `active_speech_id` that
  references an unknown speech.

**MC**
- A **🗣️ Speeches** card lists the plan, script readiness, consent, reading
  medium and countdown. The MC selects which speech is live with **Go live /
  Stop live**; the selection is stored as `liveSyncState.active_speech_id` and
  syncs to the speaker device.

**Speaker role + view**
- `speaker` is a first-class device role, offered by the role switcher and the
  `/deck/` join flow (its own 6-digit PIN). Production tokens fix the device to
  that role.
- **“Speech text — script”** is a large, high-contrast, scrollable, read-only
  teleprompter. It shows only the live speech, the speaker name, cue, mic,
  language, reading medium, consent status, timing (starts in / remaining /
  over) and the script. It never shows VIP alerts, timeline controls, role
  switching or other speeches.
- A speech appears only when it is the live `active_speech_id`, its
  `visibleToRoles` includes `speaker`, and `consent.storeScript` is not `false`.
- **Offline caching:** the assigned script is cached per wedding under
  `wzsd:v1:speaker-script:<weddingId>` and is shown with an “Offline copy”
  badge when the cartridge copy is unavailable. Only the active script is
  cached; the cache is cleared when the MC stops the speech or the event is
  wiped. The full cartridge and role token remain cached for offline use.

**Google Doc parser**
- The AI converter prompt maps `## SPEECHES` to `speechMode` + `speeches[]` and
  tells the model to copy scripts exactly (never summarise), record consent and
  `readFrom`, and add a pre-wedding TODO when a COMPLEX script is missing.

**Remaining hardening**
- Role-scoped cartridge delivery/filtering and script encryption at rest (D4)
  are still server/deployment work: the speaker view only *presents* the
  assigned script, and the device cache contains the cartridge until filtering
  lands. The full `/deck/` Apache/PWA deployment is TODO 19.

Relevant files: `src/lib/speeches.js`, `src/lib/speakerCache.js`,
`src/components/SpeechesCard.jsx`, `src/components/SpeakerView.jsx`,
`src/lib/roles.js`, `src/App.jsx`, `src/lib/liveStageState.js`,
`src/hooks/useLiveStageState.js`, `src/components/RoleJoinScreen.jsx`,
`schema/wedding-schema-v1.1.json`, `schema/ai-converter-prompt.md`,
`schema/wedding-cartridge.example.json`.

### 26. Command/undo stack, audit log and anchor-safe controls (issue #43 / P0.7)

Every stage mutation is now undoable and auditable:

- **Command/undo stack** — the last 25 state snapshots (in memory, per device)
  cover completion, swap, defer, restore, manual offsets, subtask toggles and
  speech selection. The footer **Undo** restores the previous state while
  keeping the audit log intact.
- **5-second Undo toast** — completion, swap, defer, restore, offset and clear
  offset show a bottom toast with **Undo** and a 5-second countdown. Clicking
  Undo reverts the action and dismisses the toast.
- **Hold-to-confirm** — the MC footer and Pocket Remote replace
  “MARK DONE & ADVANCE” with a 1.2-second hold button (pointer or Space/Enter).
  A quick tap does nothing; the fill bar shows progress.
- **Append-only `mutation_log`** — each action appends
  `{ id, device_id, role, op, timestamp, payload }` to the synced live state.
  A stable per-device id lives in `wzsd:v1:device-id`. Logs are merged by id
  when remote/cross-tab state is adopted, so entries are never dropped and the
  history stays append-only.
- **Anchor safety** — swap is blocked when either side is a `HARD_ANCHOR`
  (button disabled with an explanation). Defer only targets safe steps: hard
  anchors and steps carrying a photographer cue are skipped. Swapping a step
  with a photographer cue asks for explicit confirmation first.
- The demo marks the entrance step with a photographer cue so the warning path
  is visible.

Relevant files: `src/lib/liveStageState.js`, `src/hooks/useLiveStageState.js`,
`src/lib/deviceId.js`, `src/lib/stepGuards.js`,
`src/components/HoldToConfirmButton.jsx`, `src/components/UndoToast.jsx`,
`src/App.jsx`, `src/components/PocketRemoteView.jsx`, `src/index.css`,
`schema/wedding-schema-v1.1.json`.

### 27. Optional games: Test Wiedzy & Test Zgodności (issue #59 / TODO 16)

Design and content are prepared without changing the cartridge schema or the AI
converter prompt (the `games` schema is still awaiting approval):

- [`docs/optional-games.md`](docs/optional-games.md) defines the Google Doc
  `## GAMES` section with an explicit `YES` / `NO` / `UNDECIDED` per game,
  capture rules, preparation checklists, scoring, MC scripts and offline
  fallbacks.
- [`src/content/games/testWiedzy.js`](src/content/games/testWiedzy.js) contains a
  12-question trilingual knowledge-quiz bank, scoring, tie-breaker, prize, MC
  script and paper fallback.
- [`src/content/games/testZgodnosci.js`](src/content/games/testZgodnosci.js)
  contains a 10-question compatibility bank, separate bride/groom answer sheets,
  score bands, MC script, Oczepini relationship and fallbacks.
- `src/content/games/index.js` exposes the capture options (`YES`/`NO`/
  `UNDECIDED`) and game metadata.
- **Not added** to `schema/ai-converter-prompt.md` or the cartridge validator on
  purpose. Once the `games` schema is approved, wire these banks into the
  schema, parser and importer.

### 28. DJ track cutoff stopwatches (issue #47 / TODO 4)

Every step can carry one DJ cutoff. The rule is:

1. An **absolute** `dj.cutoff` (`HH:MM`) always wins.
2. Otherwise `dj.cutoffSec` counts down from that step's **actual** start
   (ISO timestamp, TODO 23), never from the planned time.
3. A relative cutoff stays **pending** until the step has actually started; an
   absolute cutoff works for future steps too.

- [`src/lib/cutoff.js`](src/lib/cutoff.js) holds the pure calculation
  (`computeCutoffStopwatches`, `activeCutoff`). It classifies each cue as
  `running`, `upcoming`, `over`, `pending` or `done`, exposes the remaining or
  overrun seconds, and sorts the active cue first.
- [`src/components/CutoffStopwatchCard.jsx`](src/components/CutoffStopwatchCard.jsx)
  renders a live primary stopwatch plus a per-step list on the DJ booth view. It
  is driven by the shared reel clock (P0.6), so ticks and overruns update every
  second.
- When a step has both, the card shows an **Absolute wins** badge and counts to
  the absolute clock time.
- Demo data: `step_03` carries both (`cutoff: "20:15"` + `cutoffSec: 3600`) to
  demonstrate precedence; `step_04` carries only `cutoffSec: 1800` and stays
  pending until it starts. `dj.cutoffSec` is limited to `0..3600` by the schema.
- The existing compact `ReelClock` cutoff chip uses the same rule through
  `buildReelClock(...).djCutoff`.

### 29. Google Doc template with stable section markers (issue #70 / D8)

The couple's Google Doc is now a deterministic input, not only an AI prompt:

- [`schema/google-doc-template.md`](schema/google-doc-template.md) is the
  copy-paste D8 template. It contains all 28 stable `## SECTION` markers in a
  fixed order, from `## EVENT` and `## COUPLE IDENTITY` through `## PHOTO PLAN`,
  `## SPEECHES`, `## GAMES` and `## EXTENSIONS`.
- [`src/lib/googleDocTemplate.js`](src/lib/googleDocTemplate.js) holds the
  canonical `SECTION_MANIFEST` (marker, required flag, v1.2 target path) plus a
  pure parser: `parseGoogleDocTemplate`, `validateGoogleDocTemplate`,
  `parseMarkdownTables`, `parseKeyValues`, `parseBullets` and
  `parseCodeBlocks`.
- [`docs/google-doc-template-conventions.md`](docs/google-doc-template-conventions.md)
  documents the marker grammar, formatting rules, section-to-field map, error
  policy and approval gate.
- `npm run validate:template` checks the template's exact marker set, order and
  fixed table headers.
- Sections map deterministically: `## TIMELINE` to `steps`, `## DJ CUES`,
  `## MC CUES` and `## SUBTASKS` attach by `Step ID`, `## VIEW VISIBILITY` to
  the D1 matrix, `## PHOTO PLAN` to the D6 online-sunset plan, and so on.
- **Provisional:** generated from the v1.2 proposal; the AI converter prompt,
  v1.1 schema and runtime importer are unchanged until v1.2 is approved. The
  parser is additive and ready to wire in after approval.

### 30. Error boundaries, last-known step and local error log (issue #66 / TODO 24)

A render crash no longer leaves a white screen:

- [`src/components/AppErrorBoundary.jsx`](src/components/AppErrorBoundary.jsx)
  wraps the whole app in `main.jsx` and each view separately: MC, DJ, pocket,
  photographer, speaker, pairing, role sign-in and cartridge loading.
- The fallback shows the **last known step** (title, planned time, location,
  type and completed count), a **Safe reload** button, and "Try this view
  again". Reload restores the saved live state, so the host continues from the
  step that actually started.
- [`src/lib/lastKnownStep.js`](src/lib/lastKnownStep.js) derives and persists a
  tiny display snapshot per wedding (`stepId`, title, time, location, counts).
  It stores no scripts, contacts, VIP alerts or sensitive notes. The top-level
  boundary scans for the newest snapshot because it does not know the wedding
  id; wiping the event clears it.
- [`src/lib/errorLog.js`](src/lib/errorLog.js) keeps a bounded (20-entry)
  `localStorage` log with timestamp, scope, role, step context, message, a short
  stack and the React component stack. The fallback shows the latest five
  entries and can copy or clear the log — useful after the event, with no
  server upload.
- The snapshot is derived during render and only persisted in an effect, so the
  boundary always has current context without extra state updates.

Limits: React error boundaries catch render/lifecycle crashes, not errors in
event handlers, timers or rejected promises. Those still belong to their own
guards; the boundary is the last line of defence against a blank screen.

### 31. App shell split, demo data and style constants (issue #64 / TODO 22)

`App.jsx` is now a routed shell instead of one god component. This is a pure
refactor with no behavior change:

- [`src/views/McMasterView.jsx`](src/views/McMasterView.jsx) owns the MC
  presentation layer (header, active-step panel, timeline/aside cards, footer,
  overlays and modals). It receives one already-derived `model` object; all
  live-sync state, effects and handlers stay in `App.jsx`.
- `App.jsx` keeps role routing (`mc`, `dj`, `pocket`, `photo`, `speaker`),
  production pairing/join branches, cartridge loading, the shared event clock
  and the error boundaries. It shrank from roughly 1,500 lines to about 650.
- [`src/demo/demoWedding.js`](src/demo/demoWedding.js) holds `DEMO_WEDDING`,
  `HALL_ENTRANCE_SCRIPT`, `TEST_WIEDZY_GAME`, `VIP_ALERTS`, the demo subtasks
  and initial live state, plus `DEFAULT_WEDDING` and `buildInitialLiveState`.
- [`src/lib/styleConstants.js`](src/lib/styleConstants.js) centralises
  `STEP_TYPE_STYLES` and the MC footer's control-button base/disabled classes.
  The class strings are unchanged.
- The per-view error boundary still wraps `McMasterView`, so a crash in the MC
  view keeps the last-known-step fallback and local error log.
- Demo data remains demo-only: an imported cartridge still replaces it, and no
  new data reaches the server.

### 32. ISO actual timestamps and migration (issue #65 / TODO 23)

Actual step starts are stored as full ISO-8601 instants internally; `HH:MM` is a
display format only:

- [`src/lib/eventTime.js`](src/lib/eventTime.js) exposes
  `normalizeActualTimestamp` and `migrateActualTimestamps`. ISO input is
  re-serialized in UTC, legacy `HH:MM`/`HH:MM:SS` is resolved against the event
  date plus venue timezone, after-midnight clocks roll to the next service day,
  and DST is handled with a two-pass offset.
- `normalizeLiveState` uses the map migration for localStorage, remote Supabase
  rows, cross-tab events and cartridge seeds. The normalized state is persisted
  again, so a device upgrades once.
- Runtime transitions (`markStepDone`, swap, defer, restore) write
  `now.toISOString()`; undo deletes the affected timestamp.
- The drift engine compares absolute instants and preserves seconds, so the old
  ±12-hour fold limit no longer applies to actual starts. `computeDriftMinutes`
  now accepts `{ eventDateISO, timeZone }` and handles ISO actuals.
- [`scripts/migrate-actual-timestamps.mjs`](scripts/migrate-actual-timestamps.mjs)
  upgrades cartridge files:
  `npm run migrate:timestamps -- file.json [--write|--check]`. Dry-run by
  default; `--check` is a CI guard.
- v1.1 still accepts both ISO and legacy `HH:MM`; v1.2 should require ISO and
  rename the map to `actualTimestamps`.
- Full details: [`docs/iso-timestamps.md`](docs/iso-timestamps.md).

### 33. Accessibility: checkboxes, modal focus, live regions and motion (issue #68 / TODO 26)

- Active-step subtasks and the pre-wedding checklist are real native
  checkboxes inside labels: `Tab` + `Space`, clickable label text, visible focus
  ring and theme-aware `accent-color`.
- [`src/components/ModalShell.jsx`](src/components/ModalShell.jsx) now traps
  `Tab` / `Shift+Tab` inside the dialog, closes on `Escape`, focuses the close
  button on open and restores focus to the trigger on close. This covers the
  teleprompter, game clicker, VIP alerts, contacts and cartridge importer.
- Stage pings and hard-anchor warnings are assertive live regions; drift pills
  and the pocket drift strip are polite live regions, all atomic.
- The Night theme's `slate-500`/`slate-600` steps were raised to meet WCAG AA on
  dark cards; the Daylight bridge was adjusted too. Focus outlines use a
  theme-aware `--focus-ring`.
- `prefers-reduced-motion: reduce` now disables all animations/transitions
  globally, including ping/pulse, stage-ping flash, pin shake and toast
  countdown.
- Contrast measurements, rules, exceptions and the manual keyboard checklist
  are in [`docs/accessibility-audit.md`](docs/accessibility-audit.md).

### 34. Local sync outbox with backoff retry (issue #67 / TODO 25)

A failed cloud publish now stays pending instead of being forgotten:

- [`src/lib/sync/outbox.js`](src/lib/sync/outbox.js) stores one metadata record
  per room in `localStorage` (`wzsd:v1:sync-outbox:<roomKey>`) with queued time,
  attempts, next retry, last attempt and last error. The payload is the latest
  local snapshot, so coalescing never drops a stage mutation.
- `useLiveStageState` has one publish path: clean sends use the 200ms debounce;
  queued sends use exponential backoff (2s, 4s, 8s … capped at 60s). On success
  it clears the outbox only when the cloud has the current snapshot; if local
  state moved during the write, the newer snapshot is requeued immediately.
- The browser `online` event and a Realtime `connected` status wake the outbox
  immediately instead of waiting out the remaining backoff. An in-flight publish
  is never overlapped.
- `SyncStatusBadge` shows **Pending sync** with the attempt count and a tooltip
  containing the next retry time and last error. It is a polite live region and
  is passed through the MC, DJ, pocket, photographer and speaker views.
- Wiping the event clears the room's outbox, so a stale snapshot cannot be
  resurrected later.
- Scenario walkthrough, storage shape and limitations:
  [`docs/sync-outbox.md`](docs/sync-outbox.md).

### 35. Vitest, schema fixtures and CI (issue #57 / TODO 14)

The project now has a repeatable test suite and a fixture contract:

- `npm test` runs **Vitest** (`vitest.config.js`, Node environment) over the
  shared schema and pure time helpers.
- [`schema/fixtures/`](schema/fixtures/) contains:
  - `valid-*` edge-case cartridges (minimal, midnight, buffers, speeches, music,
    photo/Oczepiny, ISO timestamps),
  - `real-jennifer-guillaume.json` for the real example wedding,
  - `invalid-*` cartridges, one focused rule each (IDs, references, buffers,
    cake, music window, Oczepiny anchor, fire safety, speech order, song refs,
    unknown fields, ISO format, cultural rules, PIN).
- `npm run validate:fixtures` checks every fixture and enforces the
  `valid-`/`real-`/`invalid-` naming contract.
- [`schema/validate-lib.mjs`](schema/validate-lib.mjs) shares the Ajv + semantic
  validation between the CLI, fixture suite and Vitest; the browser importer
  still uses the same semantic rules.
- Tests:
  - `tests/schema-fixtures.test.js` — fixture expectations and expected error
    reasons,
  - `tests/validation-rules.test.js` — cross-field rules directly,
  - `tests/iso-timestamps.test.js` — ISO/legacy migration edge cases.
- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs lint,
  `npm run validate:schema`, `npm run validate:fixtures`, `npm test`,
  `npm run validate:template` and the production build.
- Coverage, fixture rules and how to add a real wedding are documented in
  [`docs/testing.md`](docs/testing.md).

### Security notes

The anon key ships in the browser bundle by design, but the database is no
longer open: `live_sync_state` and `weddings` require a role JWT issued by
`join_room`, and `wedding_roles` / `join_attempts` are service-role only. There
are no anon policies or data grants; `schema.sql` is idempotent (all policies
are dropped and recreated), so it is safe to re-run on an existing deployment.

- Reads require both `wedding_id` and a valid `app_role` claim; writes are
  limited to `mc`/`pocket`. `sensitive_notes` is `mc`-only ciphertext.
- The 4-digit DDMM PIN is a local display gate, not a server secret; production
  uses 6-digit per-role PINs hashed server-side and rate-limited.
- `publish_room` sets `expires_at` to the event date + 7 days grace
  (`expiresInDays`); `join_room` rejects expired rooms with 410;
  `stage_deck_purge_expired()` removes expired and orphaned data plus old join
  attempts. The MC can wipe immediately via `stage_deck_wipe_my_room()`.
- The service-role key is only read from Edge Function secrets and is never in
  the client bundle.

Remaining hardening work (tracked in project.md): role-based filtering of
sensitive cartridge fields before delivery, script encryption, and the full
`/deck/` Apache/PWA deployment (TODO 19). Never expose the service-role key in
the client.

Role separation is now enforced by the role token for production joins. In
local/demo mode it remains a UX boundary: one paired device can still switch
views.

