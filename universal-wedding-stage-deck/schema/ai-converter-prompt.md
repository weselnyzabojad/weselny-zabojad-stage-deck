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
- `contacts` (`role`, `name`, `phone`, `notes`)
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

## Raw wedding notes

<<<PASTE THE RAW GOOGLE DOC / WEDDING NOTES HERE>>>
