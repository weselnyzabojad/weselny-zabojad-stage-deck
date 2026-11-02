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

### 4. Room PIN pairing (issue #7)

On first load (or after unpairing) the app renders a full-screen pairing gate
instead of the dashboard:

- Enter the wedding cartridge's 4-digit `syncPin` (e.g. `2008` for
  Jennifer & Guillaume). Digits auto-advance; paste and arrow keys work.
- The PIN is verified **locally**, so pairing works with no connection.
- Once paired, the PIN becomes the Realtime room key (`wzsd:<pin>`) and is
  stored under `wzsd:v1:pairing` in `localStorage`. Every device entering the
  same PIN joins the same room.
- A wrong PIN shakes the field, clears it, and shows an inline error.
- Click the **PIN: 2008 🔓** chip in the dashboard header to unpair this device.
  Timeline progress is not deleted; re-entering the PIN restores it.

Relevant files: `src/components/PairingScreen.jsx`, `src/hooks/usePairing.js`,
`src/lib/pairing.js`.

### 5. Role switcher: MC, DJ Booth and Pocket Remote (issue #8)

The header **Role** control switches this device between three views. The
choice is stored per device under `wzsd:v1:role` and is never added to the
synced payload, so one tablet can stay on MC Master while a phone follows the
same room in Pocket Remote.

| Role | Purpose |
| --- | --- |
| 🎤 **MC Master** | Full deck: trilingual scripts, game clicker, drift, catering sub-tasks, VIP radar and stage pings. |
| 🎧 **DJ Booth** | Read-only companion: projected timeline, playlist/track per step and flashing hard-cutoff timers. No step controls, scripts or family notes. |
| 📱 **Pocket Remote** | Compact phone view for garden/terrace segments: drift, current/next step, script launcher, **Mark done & advance** and **Undo**. |

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
  `currentDriftLabel` / `currentDriftTone` helpers for the header and Pocket
  pill (`ON TIME`, `+25m LATE`, `10m AHEAD`).
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
  absorb the lead. If the flex is exhausted, it prompts to pull a Joker Game
  from the drawer (when one is available).
- **On time** — leaves the planned buffer lengths untouched.

`buildDriftReport` exposes the plan as `bufferAccordion` and also returns
`accordionEntries` / `accordionProjectedFinish`, which project the recommended
durations without mutating the original cartridge. The MC dashboard shows the
recommendation in the **🪗 Buffer Accordion** card, including per-buffer
`30 → 10 min` changes, recovered minutes and the Joker prompt. Applying the
recommended duration with a one-tap control belongs to issue #13.

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
  banner appears and advises swapping or deferring a block.
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

### Security notes

The anon key ships in the browser bundle by design. The included policies are
permissive (any client with the anon key can read/write any room) because the
4-digit PIN gate is currently **client-side UX only** — it is not enforced
server-side. Before a real event, tighten this with an RPC or an Edge Function
that validates the PIN, or per-room RLS using JWT claims. Never expose the
service-role key here.

Role separation is also a UX boundary for now: all paired devices use the same
room PIN and can switch views. The roadmap's split `sync_pin_host` /
`sync_pin_dj` role PINs are not wired yet; add them before handing a DJ device
access to a real wedding cartridge.

