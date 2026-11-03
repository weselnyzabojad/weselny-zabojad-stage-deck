# WeddingSchema v1.1

> **v1.2 proposal available:** see `wedding-schema-v1.2.proposal.md`. v1.1 remains canonical until that proposal is approved.

Portable JSON cartridge specification for the Universal Wedding Stage Deck.

## Files

| File | Purpose |
| --- | --- |
| `wedding-schema-v1.1.json` | Draft 2020-12 JSON Schema (canonical). |
| `wedding-schema-v1.2.proposal.md` | Proposed v1.2 field model, decisions D1-D9, migration, and validation rules. |
| `wedding-cartridge.example.json` | Complete Jennifer & Guillaume demo cartridge. |
| `ai-converter-prompt.md` | Copy-paste prompt for converting raw Google Docs / notes into v1.1 JSON. |
| `validate-cartridge.mjs` | Structural + cross-field validator. |

Validate the example (or any cartridge):

```bash
npm run validate:schema
npm run validate:schema -- path/to/cartridge.json
```

The same schema and semantic checks run in the browser importer, so pasted
cartridges are validated against the exact same contract before they replace
the active wedding.

## AI conversion workflow

1. Open **Import** from the pairing screen or the MC header.
2. Paste raw Google Doc notes into the importer.
3. Copy **prompt + notes** into your AI.
4. Paste the returned JSON into the importer.
5. **Validate JSON** → **Import & reload**.

The prompt at `ai-converter-prompt.md` uses this schema's canonical camelCase
shape and also extracts `preWeddingTodos`, which render in the MC
**Pre-Wedding Checklist** card.


## Canonical shape

`WeddingSchema v1.1` uses **camelCase** keys and `HH:MM` local clock strings.
UTC timestamps (stage pings) use ISO-8601 `...Z`. Unknown top-level keys are
rejected; put app-specific data under `extensions`.

```json
{
  "schemaVersion": "1.1",
  "weddingId": "2026-08-20_jennifer_guillaume",
  "couple": "Jennifer & Guillaume",
  "date": "20.08.2026",
  "syncPin": "2008",
  "hostingMode": "HOST_AND_DJ",
  "culturalRules": {
    "sto_lat": { "status": "STRICT_NO", "note": "No Sto Lat tonight" },
    "gorzko": { "status": "STRICT_NO" },
    "bread_salt": { "status": "YES" }
  },
  "hardAnchors": [],
  "steps": []
}
```

### Top-level fields

| Field | Required | Notes |
| --- | --- | --- |
| `schemaVersion` | yes | Must be `"1.1"`. |
| `weddingId` | yes | `YYYY-MM-DD_slug`, also the room ID. |
| `couple` | yes | Display name. |
| `date` | yes | `DD.MM.YYYY`. |
| `syncPin` | yes | Exactly four digits. Shared by paired devices. |
| `hostingMode` | yes | `HOST_AND_DJ` or `HOST_ONLY`. |
| `culturalRules` | yes | All three rules required; see below. |
| `steps` | yes | At least one step. |
| `role` | no | Legacy display hint only; device role is local. |
| `venue` | no | Venue name / address. |
| `driftMinutes` | no | Demo seed only; live drift is computed. |
| `vipRadarCount` | no | Should equal `tact_and_vip_alerts.length`. |
| `tact_and_vip_alerts` | no | Sensitive family / care notes. |
| `jokersCount` | no | Should equal `jokerGames.length` when both exist. |
| `jokerGames` | no | Joker Drawer games / crates. |
| `coHosts` | no | **Legacy (D10).** Accepted for backward compatibility; dropped on import. |
| `contentCreators` | no | **Legacy (D10).** Accepted for backward compatibility; dropped on import. |
| `hardAnchors` | no | Fixed real-world deadlines. |
| `demographics` | no | Guest counts / languages. |
| `contacts` | no | Vendor and family contacts. |
| `preWeddingTodos` | no | Pre-flight checklist. |
| `weatherVariants` | no | `DEFAULT`, `RAIN`, `HEATWAVE`. |
| `speechMode` | no | `OFF`, `LIGHT`, `COMPLEX` (TODO 8; provisional). |
| `speeches` | no | Speech records + verbatim script text (TODO 8; provisional). |
| `liveSyncState` | no | Optional seed for the synced live state. |
| `extensions` | no | Forward-compatible namespace. |

## Steps

```json
{
  "id": "step_04",
  "time": "19:30",
  "durationMin": 30,
  "title": "Buffets Open & Dance Floor",
  "type": "BUFFER",
  "location": "Main Hall",
  "deferable": true,
  "buffer": { "minDurationMin": 10, "maxDurationMin": 60, "danceBlock": true },
  "dj": { "playlist": "Dance Floor Block", "track": "September — Earth, Wind & Fire" }
}
```

| Type | Behavior |
| --- | --- |
| `ELASTIC` | Shifts with real drift; projects realistic starts/ends. |
| `BUFFER` | Accordion shock-absorber. `buffer` gives the allowed min/max range. |
| `HARD_ANCHOR` | Pinned to its clock time; never shifts. |

Notes:

- `time` is the planned start. Optional `planned` overrides it for drift math.
- `realStart` is only a demo/test seed; live actual starts are logged on transitions.
- `durationMin` should sit between `buffer.minDurationMin` and
  `buffer.maxDurationMin` when a buffer range is present.
- `deferable: true` makes the step eligible for **Defer to Joker Drawer**.
- `weatherOption` can scope a step to `DEFAULT`, `RAIN` or `HEATWAVE`.

### DJ cue

```json
"dj": {
  "playlist": "Dinner Jazz",
  "track": "Fly Me to the Moon — Frank Sinatra",
  "cutoff": "20:15",
  "cutoffSec": 3600,
  "note": "Fade under the speech"
}
```

### Teleprompter

`SPEECH` items:

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

`GAME_QUESTIONS` items:

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

`items` must be non-empty if `has_script` is true.

## Cultural rules

| Rule | Allowed statuses |
| --- | --- |
| `sto_lat` | `YES`, `YES_EXPLAIN`, `STRICT_NO`, `TBC` |
| `gorzko` | `YES`, `IF_GUESTS_START`, `STRICT_NO`, `TBC` |
| `bread_salt` | `YES`, `NO`, `TBC` |

Each rule accepts an optional `note`.

## Legacy: co-hosts and content creators

`coHosts` and `contentCreators` belonged to the removed Issue #16 module. They
remain defined only so older v1.1 cartridges still pass structural validation.
The app no longer renders them, the AI converter prompt no longer emits them,
and the importer drops both arrays when a cartridge is stored (D10 / TODO 20).
Use `contacts` for the vendor directory.

```json
"coHosts": [],
"contentCreators": []
```

## Hard anchors

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
`alertBeforeMin` defaults to 45. Anchors never move; the radar compares the
projected end of the last block before each anchor and warns on collision or
10-minute-or-less slack.

## Live sync state

The optional `liveSyncState` seeds the synced state. In production the same
object is stored in `localStorage` and in the Supabase
`public.live_sync_state.state` JSONB column.

```json
{
  "active_step_id": "step_03",
  "active_speech_id": "speech_witness",
  "completed_step_ids": ["step_01", "step_02"],
  "actual_timestamps": { "step_03": "18:25" },
  "checked_subtasks": { "Speeches": false },
  "stage_ping": null,
  "step_order": ["step_01", "step_02", "step_03", "step_04", "step_05"],
  "deferred_step_ids": [],
  "manual_offset_minutes": 0
}
```

Missing fields are filled with safe defaults by `normalizeLiveState`:

- `step_order` -> cartridge order
- `deferred_step_ids` -> `[]`
- `manual_offset_minutes` -> `0`
- `stage_ping` -> `null`
- `active_speech_id` -> `null` (the MC selects the live speech)

`stage_ping.type` is one of `drop_track`, `fade_music`, `hold_2m`, `ready`.
`manual_offset_minutes` is capped at 720 (12 hours).

## Versioning

- `schemaVersion` is a required literal for each release.
- Additive fields can ship within v1.1 as optional; breaking changes (renames,
  removed fields, changed semantics) require v1.2+.
- The importer (issue #15) is responsible for mapping legacy snake_case Google
  Docs exports into this canonical camelCase shape. The schema itself rejects
  unknown top-level keys; use `extensions` for temporary extras.

## Compatibility with the roadmap

The product roadmap sketched v1.1 with snake_case examples (`wedding_id`,
`sync_pin`, `hard_anchors`, `live_sync_state`). This implementation adopts the
app's canonical camelCase names and formalizes the controls added in Sprint 3
(`step_order`, `deferred_step_ids`, `manual_offset_minutes`, `stage_ping`).
The AI importer will translate raw documents and legacy snake_case keys into
this schema.
