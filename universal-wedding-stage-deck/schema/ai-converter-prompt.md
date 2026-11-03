# Universal Wedding Stage Deck — AI Converter Prompt (WeddingSchema v1.1)

Use this prompt with your preferred AI chat. Paste your raw Google Doc
harmonogram / wedding notes where indicated, or use the in-app **Import
Cartridge** panel to combine the prompt and notes automatically.

---

You are an expert wedding MC, stage manager and data extractor. Convert the raw
wedding notes below into **one valid `WeddingSchema v1.1` JSON cartridge** for
the Universal Wedding Stage Deck.

## Output contract

- Return **JSON only**. No markdown fences, no commentary, no trailing commas.
- Use camelCase keys exactly as specified.
- Use 24-hour local clock strings (`HH:MM`) for times.
- Use `DD.MM.YYYY` for the wedding date.
- Never invent sensitive facts. If a value is unknown, use `TBC`, an empty
  array, or a reasonable placeholder and record the assumption in
  `extensions.warnings`.
- Every step must have a unique `id` (`step_01`, `step_02`, ...).
- `schemaVersion` must be exactly `"1.1"`.

## Required top-level fields

```json
{
  "schemaVersion": "1.1",
  "weddingId": "YYYY-MM-DD_bride_groom",
  "couple": "Bride & Groom",
  "date": "DD.MM.YYYY",
  "syncPin": "1234",
  "hostingMode": "HOST_AND_DJ",
  "culturalRules": {
    "sto_lat": { "status": "TBC", "note": "" },
    "gorzko": { "status": "TBC", "note": "" },
    "bread_salt": { "status": "TBC", "note": "" }
  },
  "steps": []
}
```

- `weddingId`: lowercase date + underscore + lowercase names, e.g.
  `2026-08-20_jennifer_guillaume`.
- `syncPin`: exactly four digits. If the source has no PIN, use `"0000"` and
  add a warning.
- `hostingMode`: `HOST_AND_DJ` when there is a DJ / audio cues, otherwise
  `HOST_ONLY`.

## Couple identity (Google Doc `## COUPLE IDENTITY`)

Extract the top-bar identity from the Google Doc section `## COUPLE IDENTITY`:

```text
## COUPLE IDENTITY
Bride first name: Jennifer
Bride nationality: French
Groom first name: Guillaume
Groom nationality: French
Shared languages: FR, PL, EN
```

Map it to `coupleProfile` (keep the legacy `couple` string as the fallback
label):

```json
"couple": "Jennifer & Guillaume",
"coupleProfile": {
  "bride": { "firstName": "Jennifer", "nationalities": ["FR"] },
  "groom": { "firstName": "Guillaume", "nationalities": ["FR"] },
  "commonLanguages": ["FR", "PL", "EN"]
}
```

Rules:

- Keep the cartridge order: bride first, then groom. Never split or guess names
  from the `couple` string at runtime.
- `nationalities[]` are ISO 3166-1 alpha-2 codes. Normalize names:
  `French` / `France` / `Français` / `Francja` -> `FR`;
  `Polish` / `Poland` / `Polonais` / `Pologne` / `Polska` -> `PL`.
- **Never infer nationality from a name, birthplace or spoken language.**
  `English` is language `EN`, not country `GB`, unless the document explicitly
  states the nationality. If the section is ambiguous, leave `nationalities`
  empty, keep the raw text in `extensions.warnings`, and let the couple review
  the import preview.
- `commonLanguages[]` are ISO 639-1 codes for the languages the couple and the
  MC/host share. Do not reuse `demographics` or `languages.supported` as the
  source; `languages.supported` describes cartridge content, not the couple.
- `nationalities` may be empty; never require or invent a flag.
- If `## COUPLE IDENTITY` is missing, you may split the legacy `couple` string on
  `&` to prefill first names, but mark it unconfirmed in
  `extensions.warnings` and require review in the import preview.

## Cultural rules

| Rule | Allowed `status` values |
| --- | --- |
| `sto_lat` | `YES`, `YES_EXPLAIN`, `STRICT_NO`, `TBC` |
| `gorzko` | `YES`, `IF_GUESTS_START`, `STRICT_NO`, `TBC` |
| `bread_salt` | `YES`, `NO`, `TBC` |

Add a short `note` when the source explains the rule.

## Steps

Each step uses this shape:

```json
{
  "id": "step_01",
  "time": "16:30",
  "durationMin": 30,
  "title": "Aperitif in Garden",
  "type": "BUFFER",
  "location": "Garden",
  "deferable": false,
  "buffer": { "minDurationMin": 15, "maxDurationMin": 45, "danceBlock": false },
  "dj": { "playlist": "", "track": "", "cutoff": "18:20" },
  "teleprompter": { "has_script": false, "type": "SPEECH", "title": "", "items": [] },
  "cateringNotes": "",
  "subTasks": [],
  "propsAndFx": []
}
```

Optional fields may be omitted when empty. Required fields are `id`, `time`,
`durationMin`, `title`, `type` and `location`.

### Classification rules

- `HARD_ANCHOR`: fixed real-world deadlines that must never move. Examples:
  church ceremony, venue meal times, vendor departure, sunset shoot, midnight
  Oczepiny, shuttle bus, fireworks.
- `ELASTIC`: sequence-dependent blocks that shift with live drift. Examples:
  speeches, dinner courses, first dance, games, cake, bouquet toss.
- `BUFFER`: accordion shock-absorbers. Examples: cocktail / vin d'honneur,
  musical dance blocks, arrival windows, games pools.

For every `BUFFER` step, provide a realistic range:

- `minDurationMin`: 25–50% of the planned duration, rounded to 5 minutes.
- `maxDurationMin`: 100–200% of the planned duration, rounded to 5 minutes.
- The planned `durationMin` must lie between those bounds.
- Set `danceBlock: true` for musical/dance buffers.
- Set `deferable: true` only for non-essential games, dance blocks or crates
  that can safely move to the Joker Drawer.

## Hard anchors

Extract fixed deadlines into `hardAnchors`:

```json
{
  "id": "sunset",
  "time": "21:10",
  "label": "Sunset Window",
  "alertBeforeMin": 30,
  "kind": "SUNSET"
}
```

`kind` is one of `VENDOR`, `SUNSET`, `TRANSPORT`, `FAMILY`, `OTHER`.
Use `alertBeforeMin: 45` unless the source specifies otherwise.

## DJ cues

```json
"dj": {
  "playlist": "Dinner Jazz",
  "track": "Fly Me to the Moon — Frank Sinatra",
  "cutoff": "20:15",
  "cutoffSec": 3600,
  "note": "Fade under the speech"
}
```

Never put MC scripts or VIP notes inside `dj`.

## Important songs (Google Doc `## IMPORTANT SONGS`)

Extract the fixed key moments from the Google Doc section `## IMPORTANT SONGS`
into `musicPolicy.importantSongs[]`. The section carries one row per moment:
moment, title, artist, version, source type, link or file name, start/end cue
and notes.

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
        "fileRef": "assets/audio/marry-you-bruno-mars.mp3",
        "filename": "marry-you-bruno-mars.mp3",
        "checksum": "sha256:...",
        "durationSec": 230,
        "availability": "LOCAL",
        "notes": "Clean intro; no cold ending."
      },
      "backupSource": {
        "type": "SPOTIFY",
        "url": "https://open.spotify.com/track/..."
      },
      "note": "Wait for the MC cue before pressing play."
    }
  ]
}
```

Rules:

- `moment` is `GRAND_ENTRANCE`, `CAKE`, `FIRST_DANCE`, `PARENTS_DANCE`,
  `LAST_DANCE` or `CUSTOM`. `GRAND_ENTRANCE`, `CAKE` and `FIRST_DANCE` are the
  expected rows.
- `source.type` is `CUSTOMER_FILE`, `YOUTUBE`, `SPOTIFY`, `DEEZER` or `OTHER`.
  `OTHER` uses `label` for Tidal, Apple Music, SoundCloud, etc.
- Preserve the original link **exactly**. Never invent, shorten or resolve a
  Spotify, Deezer, YouTube or other URL. If the row has no link, leave `url`
  out, add an `extensions.warnings` entry and do not block the import: the
  couple may send the file later.
- `CUSTOMER_FILE` requires a stable `fileRef` (and `filename`); never embed
  audio bytes in the cartridge. Record `checksum`, `durationSec` and
  `availability` when known.
- Convert start/end cues to seconds (`startAtSec`, `fadeOutSec`).
- Link the song to its timeline block with `stepId` and keep `plannedTime`
  equal to that step's time.
- Add `backupSource` only when the couple provided a second source. Never store
  a signed URL or a QR image: the DJ Booth generates the QR locally from the
  stored link.

## Music policy (Google Doc `## MUSIC POLICY` / `## GUEST REQUESTS`)

Fill `musicPolicy` alongside `importantSongs[]`:

```json
"musicPolicy": {
  "mustPlay": [
    { "id": "first_dance", "track": "Perfect - Ed Sheeran", "note": "First dance — duet version." }
  ],
  "doNotPlay": [
    { "id": "no_macarena", "track": "Macarena - Los del Río", "reason": "Couple's request." }
  ],
  "requestsOpen": true,
  "requestWindow": { "start": "20:00", "end": "23:00" },
  "cleanVersions": true,
  "licensing": "Venue ZAIKS license confirmed."
}
```

Rules:

- `mustPlay` entries need a stable `id` and `track`. When a song is also a key
  moment, reuse the `importantSongs[].id` (`first_dance`, `grand_entrance`,
  `cake_cutting`) so the app shows one title; do not store conflicting metadata
  in both blocks.
- `doNotPlay` entries need a stable `id`, `track` and the `reason` given by the
  couple.
- `requestsOpen`: `true` when guests may request songs, `false` when the couple
  declines requests. Omit when unknown.
- `requestWindow.start` and `.end` are `HH:MM`; `end` must be after `start`.
- `cleanVersions`: `true` when only clean/radio edits may be played.
- `licensing`: free text for the licence (venue ZAIKS, SACEM, etc.).
- Never invent songs, reasons, request windows or licensing details.

## Cake protocol (Google Doc `## CAKE`)

Extract the cake protocol into the `cake` block:

```json
"cake": {
  "time": "20:30",
  "cuttingSong": "Cake - The Coup",
  "sparklers": true,
  "photographerCue": "Front-left of the cake table",
  "serveTime": "20:45"
}
```

Rules:

- `time` is the cutting time, `serveTime` is when the plates leave the kitchen;
  `serveTime` must not be before `time`.
- `cuttingSong` must match the `CAKE` row of `musicPolicy.importantSongs[]`. If
  both are present, keep the same title and artist; never store two conflicting
  songs. The app prefers the Key Songs entry and ignores a conflicting
  `cuttingSong`.
- `sparklers` is a boolean. Omit it when the source does not say; do not invent
  a permit or an effect.
- `photographerCue` is the photographer position or cue (for example
  "front-left of the cake table").
- Never invent a cake song, time or cue.

## Vendor contacts (Google Doc `## VENDOR CONTACTS`)

Extract the vendor directory into `contacts`:

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

Rules:

- Give every contact a stable `id` (lowercase, underscores) so it can be
  referenced.
- Copy `phone` and `email` exactly as written; never invent or guess them.
- `leavesAt` is the departure time as `HH:MM`. When the source treats it as a
  fixed departure, reuse the matching `hardAnchors[].time` so the directory can
  link to the protected anchor; add the anchor if the source defines it but the
  timeline does not.
- Keep `role` short: `DJ`, `Photo / Video`, `Venue manager`, `Florist`,
  `Transport`, etc.
- Do not put MC scripts or VIP notes in `contacts`.

## Teleprompter

### Speech

```json
{
  "has_script": true,
  "type": "SPEECH",
  "title": "Welcome",
  "items": [
    {
      "id": "welcome",
      "heading": "Welcome the couple",
      "lines": [
        { "lang": "PL", "text": "..." },
        { "lang": "FR", "text": "..." },
        { "lang": "EN", "text": "..." }
      ]
    }
  ]
}
```

### Game questions

```json
{
  "has_script": true,
  "type": "GAME_QUESTIONS",
  "title": "Test Wiedzy",
  "items": [
    {
      "id": "q01",
      "question": { "PL": "...", "FR": "...", "EN": "..." },
      "answer": "Antoine"
    }
  ]
}
```

Keep the source language where available; do not translate invented content.

## VIP alerts

Extract sensitive family/care notes into `tact_and_vip_alerts`:

```json
{
  "id": "uncle-sylwek",
  "tone": "critical",
  "icon": "🎸",
  "tag": "Family",
  "title": "Uncle Sylwek — guitar limit",
  "detail": "Allow MAX 1 short performance."
}
```

`tone` is one of `critical`, `celebrate`, `care`, `info`, `warning`.

## Joker games

Extract games / crates that are not fixed into:

```json
"jokersCount": 2,
"jokerGames": [
  { "id": "joker_1", "category": "GAME", "title": "Musical Chairs", "content": "..." },
  { "id": "joker_2", "category": "MUSIC_CRATE", "title": "Polish Disco", "content": "..." }
]
```

`jokersCount` must equal `jokerGames.length`. `category` is `GAME`,
`ANECDOTE` or `MUSIC_CRATE`.

## Removed: co-hosts and content creators

The Issue #16 module was removed (D10 / TODO 20). **Do not emit `coHosts` or
`contentCreators`** in new cartridges; if the source mentions assistant hosts or
social-media vendors, ignore those blocks or place a short note in
`extensions.warnings`. The v1.1 schema still accepts the legacy arrays so old
cartridges validate, but the importer drops them.

## Pre-Flight Action Extractor

Scan the source for pre-wedding tasks and put them in `preWeddingTodos`:

```json
"preWeddingTodos": [
  { "task": "Call DJ Karol 1 week before", "done": false },
  { "task": "Check XLR cables at 16:15", "done": false },
  { "task": "Confirm Test Zgodności with witness Bartek", "done": false }
]
```

Include calls to vendors, packing checks, document confirmations, transport
confirmations and setup checks. Do not put these tasks in the main `steps`
timeline unless they are actual on-stage blocks.

## Enrichment fields

Include when present in the source:

- `venue`
- `demographics` (`total`, `pl`, `fr`, `other`, `languages`, `notes`)
- `contacts` (`id`, `role`, `name`, `phone`, `email`, `leavesAt`, `notes`)
- `weatherVariants` (`DEFAULT`, `RAIN`, `HEATWAVE`)
- `vipRadarCount` (must equal `tact_and_vip_alerts.length`)

## Live sync state

Add a seed state:

```json
"liveSyncState": {
  "active_step_id": "step_01",
  "completed_step_ids": [],
  "actual_timestamps": {},
  "checked_subtasks": {},
  "stage_ping": null,
  "step_order": ["step_01", "step_02"],
  "deferred_step_ids": [],
  "manual_offset_minutes": 0
}
```

`step_order` must contain every step id exactly once. `active_step_id` must be
the first step. If the source says the wedding is already in progress, seed the
matching completed ids and actual timestamps instead.

`actual_timestamps` store full ISO-8601 datetimes in v1.2 (for example
`2026-08-20T18:25:00+02:00`). Bare `HH:MM` is accepted only for legacy v1.1
cartridges and is migrated to ISO when the cartridge loads.

## Final validation checklist

Before returning JSON, verify:

1. `schemaVersion` is `"1.1"`.
2. All required top-level fields exist.
3. All step ids are unique and `step_order` matches the step list.
4. All times are `HH:MM`; all durations are positive integers.
5. `BUFFER` ranges contain the planned duration.
6. `jokersCount === jokerGames.length`.
7. `vipRadarCount === tact_and_vip_alerts.length`.
8. No MC scripts or VIP details are inside `dj`.
9. No markdown fences or commentary surround the JSON.
10. Any assumptions are listed in `extensions.warnings`.
11. `cake.serveTime` is not before `cake.time`, and the cake song matches the
    `CAKE` row in `musicPolicy.importantSongs[]`.

## Raw wedding notes

<<<PASTE THE RAW GOOGLE DOC / WEDDING NOTES HERE>>>
