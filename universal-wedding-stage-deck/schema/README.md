# WeddingSchema v1.1

> **v1.2 proposal available:** see `wedding-schema-v1.2.proposal.md`. v1.1 remains canonical until that proposal is approved.

Portable JSON cartridge specification for the Universal Wedding Stage Deck.

## Files

| File | Purpose |
| --- | --- |
| `wedding-schema-v1.1.json` | Draft 2020-12 JSON Schema (canonical). |
| `wedding-schema-v1.2.proposal.md` | Proposed v1.2 field model, decisions D1-D9, migration, and validation rules. |
| `google-doc-template.md` | Provisional Google Doc template with stable `## SECTION` markers (D8 / issue #70). |
| `wedding-cartridge.example.json` | Complete Jennifer & Guillaume demo cartridge. |
| `validate-cartridge.mjs` | Structural + cross-field validator. |
| `validate-lib.mjs` | Shared Ajv + semantic validator used by the CLI, fixtures and Vitest. |
| `validate-fixtures.mjs` | Fixture-suite validator (`valid-`/`real-` pass, `invalid-` fail). |
| `fixtures/` | One fixture per edge case, one per real wedding, one per invalid rule. |

The Google Doc template is generated from the v1.2 proposal and is not wired
into the admin publishing flow until v1.2 is approved. Its conventions and field map live in
[`docs/google-doc-template-conventions.md`](../docs/google-doc-template-conventions.md);
check it with `npm run validate:template`.

Validate the example (or any cartridge):

```bash
npm run validate:schema
npm run validate:schema -- path/to/cartridge.json
npm run validate:fixtures
npm test
```

The same schema and semantic checks run in the admin publishing flow and in the
role-device cache, so a cartridge is validated against the exact same contract
before it is published or cached.

## Google Doc input workflow

1. Fill in `google-doc-template.md` as a Google Doc, keeping every stable
   `## SECTION` marker in order.
2. The admin Drive flow (#168–#170) reads the Doc server-side and converts the
   Google Docs API response with `googleDocToTemplateText(doc)`.
3. The deterministic parser (`parseGoogleDocTemplate`) validates the section
   markers and table headers.
4. Validate, preview the diff and publish from `/deck/admin`; the server snapshot
   becomes the source for role devices. Manual JSON paste remains the
   offline/legacy fallback.

The template uses this schema's canonical camelCase shape.


## Canonical shape

`WeddingSchema v1.1` uses **camelCase** keys and `HH:MM` local clock strings.
UTC timestamps (stage pings) use ISO-8601 `...Z`. Unknown top-level keys are
rejected; put app-specific data under `extensions`.

```json
{
  "schemaVersion": "1.1",
  "weddingId": "2026-08-20_jennifer_guillaume",
  "coupleProfile": {
    "bride": { "firstName": "Jennifer", "nationalities": ["FR"] },
    "groom": { "firstName": "Guillaume", "nationalities": ["FR"] },
    "commonLanguages": ["FR", "PL", "EN"]
  },
  "date": "20.08.2026",
  "syncPin": "2008",
  "hostingMode": "HOST_AND_DJ",
  "culturalRules": {
    "sto_lat": { "status": "STRICT_NO", "note": "No Sto Lat tonight" },
    "gorzko": { "status": "STRICT_NO" },
    "bread_salt": { "status": "YES" }
  },
  "steps": []
}
```

### Top-level fields

| Field | Required | Notes |
| --- | --- | --- |
| `schemaVersion` | yes | Must be `"1.1"`. |
| `weddingId` | yes | `YYYY-MM-DD_slug`, also the room ID. |
| `coupleProfile` | yes | The only couple identity source: bride/groom first names, nationalities and common languages. |
| `date` | yes | `DD.MM.YYYY`. |
| `syncPin` | yes | Exactly four digits. Shared by paired devices. |
| `hostingMode` | yes | `HOST_AND_DJ` or `HOST_ONLY`. |
| `culturalRules` | yes | All three rules required; see below. |
| `steps` | yes | At least one step. |
| `role` | no | Legacy display hint only; device role is local. |
| `driftMinutes` | no | Demo seed only; live drift is computed. |
| `hardAnchors` | no | Derived from `HARD_ANCHOR` steps; never authored in the Doc. |
| `demographics` | no | Guest counts / languages. |
| `speechMode` | no | `OFF`, `LIGHT`, `COMPLEX`. |
| `speeches` | no | Speech records + verbatim script text, consent and speaker visibility. |
| `witnesses` | no | Key persons with language, admin-only contacts, responsibilities and speech ids. |
| `liveSyncState` | no | Optional seed for the synced live state. |
| `extensions` | no | Forward-compatible namespace. |

## Steps

```json
{
  "id": "step_01",
  "time": "16:30",
  "durationMin": 30,
  "title": "Cocktail / Vin d'honneur",
  "type": "FLEXIBLE",
  "location": "Garden",
  "dj": { "playlist": "Garden Aperitif", "track": "La Vie en Rose — Édith Piaf" }
}
```

| Type | Behavior |
| --- | --- |
| `FLEXIBLE` | Non-mandatory step; shifts with real drift and projects realistic starts/ends. |
| `HARD_ANCHOR` | Pinned to its clock time; never shifts. Mandatory steps use this type. |

Notes:

- `time` is the planned start. Optional `planned` overrides it for drift math.
- `realStart` is only a demo/test seed; live actual starts are logged on transitions.
- `BUFFER` and `ELASTIC` are removed; legacy cartridges must migrate to
  `FLEXIBLE` or `HARD_ANCHOR`.

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

## Speeches

`speechMode` is `OFF`, `LIGHT` or `COMPLEX`. Each speech may override
`LIGHT` / `COMPLEX`:

```json
"speeches": [
  {
    "id": "speech_witness",
    "speaker": { "name": "Bartek", "relationship": "Best man" },
    "order": 1,
    "time": "19:45",
    "durationMin": 5,
    "language": "PL",
    "mic": "MIC_2",
    "cue": "After the main course",
    "script": { "text": "...", "format": "PLAIN", "ready": true, "source": "GOOGLE_DOC" },
    "delivery": "READ",
    "readFrom": "TABLET",
    "consent": { "storeScript": true },
    "visibleToRoles": ["mc", "speaker"]
  }
]
```

- Scripts are stored verbatim; never summarise or rewrite them.
- `consent.storeScript: false` locks the script on the speaker device.
  `visibleToRoles` must include `speaker` (or be empty) for the script to appear.
- `delivery` is `READ`, `MEMORIZE` or `NOTES`; `readFrom` is `PHONE`, `TABLET`,
  `PAPER`, `MEMORY` or `OTHER`.
- `liveSyncState.active_speech_id` selects the live speech (synced to the
  speaker device). A missing COMPLEX script warns; it does not block admin
  publishing.

## Mandatory data and hard anchors

Mandatory data is embedded in the timeline step it belongs to. A step may carry
an optional `mandatory` object; the step `time` is the only clock value. Steps
with `type: "HARD_ANCHOR"` become the derived `hardAnchors` array.

```json
{
  "id": "photo_leave",
  "time": "20:30",
  "durationMin": 1,
  "title": "Photographer leaves",
  "type": "HARD_ANCHOR",
  "location": "Terrace",
  "mandatory": {
    "kind": "MILESTONE",
    "label": "Photographer leaves",
    "milestoneKind": "PHOTO",
    "alertBeforeMin": 45
  }
}
```

`mandatory.kind` is one of `FIRST_GUESTS_ARRIVAL`, `KITCHEN_SERVICE`,
`CAKE_SERVICE`, `CLOSURE` or `MILESTONE`. Kitchen courses carry
`serviceMode`; the cake step carries `cakeServiceMode`; the closure step carries
`closureExtensionAllowed`, `closureExtensionUntil` and `lastSong`. Photo and
camera are separate milestones (`milestoneKind: "PHOTO"` and `"CAMERA"`);
Oczepiny is a game step, not an anchor.

`deriveHardAnchors(steps)` produces the `hardAnchors` array. `milestoneKind` is
one of `PHOTO`, `CAMERA`, `VENDOR`, `SUNSET`, `TRANSPORT`, `FAMILY`, `OTHER`.
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
  "active_speech_id": "speech_witness",
  "mutation_log": []
}
```

Missing fields are filled with safe defaults by `normalizeLiveState`:

- `step_order` -> cartridge order
- `stage_ping` -> `null`
- `active_speech_id` -> `null` (the MC selects the live speech)
- `mutation_log` -> `[]` (append-only audit entries)

`stage_ping.type` is one of `drop_track`, `fade_music`, `hold_2m`, `ready`.

## Actual timestamp migration

`liveSyncState.actual_timestamps` stores full ISO-8601 datetimes internally
(TODO 23). Legacy `HH:MM` values still validate and are migrated on load. To
upgrade a cartridge file ahead of time:

```bash
npm run migrate:timestamps -- path/to/cartridge.json --check
npm run migrate:timestamps -- path/to/cartridge.json --write
```

See [`docs/iso-timestamps.md`](../docs/iso-timestamps.md) for the storage shape,
display rules and edge cases.

## Versioning

- `schemaVersion` is a required literal for each release.
- Additive fields can ship within v1.1 as optional; breaking changes (renames,
  removed fields, changed semantics) require v1.2+.
- The shared admin converter (issue #15) is responsible for mapping legacy
  snake_case Google Docs exports into this canonical camelCase shape. The schema
  itself rejects unknown top-level keys; use `extensions` for temporary extras.

## Compatibility with the roadmap

The product roadmap sketched v1.1 with snake_case examples (`wedding_id`,
`sync_pin`, `hard_anchors`, `live_sync_state`). This implementation adopts the
app's canonical camelCase names and formalizes the controls added in Sprint 3
(`step_order`, `stage_ping`).
The deterministic Google Doc parser and admin publishing flow translate raw documents and legacy
snake_case keys into this schema.
