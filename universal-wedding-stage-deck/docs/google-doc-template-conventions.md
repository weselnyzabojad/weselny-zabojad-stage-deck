# Google Doc template conventions (D8 / issue #70)

> **Status: provisional.** These conventions are generated from the v1.2
> proposal (`schema/wedding-schema-v1.2.proposal.md`). v1.1 remains canonical
> until v1.2 is approved. Regenerate the template and this map when
> `schema/wedding-schema-v1.2.json` is frozen.

The couple writes one Google Doc per wedding. The importer maps that Doc to a
`WeddingSchema v1.2` cartridge deterministically, without an AI guess, by
reading:

1. stable `## SECTION` markers,
2. fixed table headers,
3. fixed `Key: value` field names,
4. fenced text blocks for verbatim scripts.

Files:

| File | Purpose |
| --- | --- |
| [`schema/google-doc-template.md`](../schema/google-doc-template.md) | Copy-paste template for the couple. |
| [`src/lib/googleDocTemplate.js`](../src/lib/googleDocTemplate.js) | Section manifest + pure parser/validator. |
| [`scripts/validate-google-doc-template.mjs`](../scripts/validate-google-doc-template.mjs) | CI-style check: `npm run validate:template`. |

The deterministic Google Doc converter and parser are additive: v1.2 is not
approved yet, and v1.1 remains the runtime contract.

---

## 1. Marker grammar

A section starts with a line that matches:

```text
## SECTION NAME
```

Rules:

- Exactly two `#`, one space, then the marker.
- The marker is **uppercase ASCII** and uses only the names in the manifest.
  Unknown markers are an error, never silently ignored.
- A marker may appear **once**. Duplicates are an error.
- `###` headings are sub-headings inside a section. They may be renamed or
  removed without breaking parsing.
- The parser ignores `##` lines inside fenced code blocks (```` ``` ````).
- Content before the first marker is `preamble` and is never mapped.
- The canonical order must be kept in the template. Out-of-order sections still
  parse (with a warning) so a couple cannot lose data by moving a block, but
  keep the order for readable diffs.

Canonical order and mapping:

| # | Marker | Required | Maps to |
| --- | --- | --- | --- |
| 1 | `## EVENT` | yes | `weddingId`, `couple`, `date`, `dateISO`, `syncPin`, `servicePackage`, `venue` |
| 2 | `## COUPLE IDENTITY` | yes | `couple`, `coupleProfile` |
| 3 | `## LANGUAGES` | yes | `languages` |
| 4 | `## CULTURAL RULES` | yes | `culturalRules` |
| 5 | `## OCZEPINY` | no | `oczepiny` |
| 6 | `## TIMELINE` | yes | `steps` |
| 7 | `## DJ CUES` | no | `steps[].dj` |
| 8 | `## MC CUES` | no | `steps[].mcCues` |
| 9 | `## SUBTASKS` | no | `steps[].subTasks` |
| 10 | `## HARD ANCHORS` | no | `hardAnchors` |
| 11 | `## VENUE LOGISTICS` | no | `venueLogistics` |
| 12 | `## VIEW VISIBILITY` | yes | `viewVisibility` |
| 13 | `## MEDIA TEAM` | no | `mediaTeam` |
| 14 | `## PHOTO PLAN` | no | `photoPlan` |
| 15 | `## IMPORTANT SONGS` | no | `musicPolicy.importantSongs` |
| 16 | `## MUSIC POLICY` | no | `musicPolicy` |
| 17 | `## GUEST REQUESTS` | no | `musicPolicy.requestWindow`, `requestsOpen` |
| 18 | `## SPEECHES` | no | `speeches` |
| 19 | `## CAKE` | no | `cake` |
| 20 | `## GAMES` | no | `games` (schema still pending approval) |
| 21 | `## KITCHEN` | no | `kitchen` |
| 22 | `## PRE-WEDDING TODOS` | no | `preWeddingTodos` |
| 23 | `## PRIVACY` | no | `privacy` (encryption metadata only) |
| 24 | `## LIVE SYNC STATE` | no | `liveSyncState` (demo seed only) |
| 25 | `## EXTENSIONS` | no | `extensions` |
| 26 | `## MANDATORY STEPS` | no | `mandatorySteps` |

The machine-readable source of truth is `SECTION_MANIFEST` in
`src/lib/googleDocTemplate.js`. The template validator fails if a marker is
missing, duplicated, unknown, out of order, or has the wrong table header.

---

## 2. Formatting rules

### Key/value sections

Use one `Key: value` pair per line. Keys are the exact English labels shown in
the template. Values keep their original language and punctuation.

```text
Wedding ID: 2026-08-20_jennifer_guillaume
Date ISO: 2026-08-20
Sync PIN: 2008
```

Rules:

- The first colon separates key and value; later colons belong to the value.
- Do not use a colon in field names.
- Surrounding backticks and bold/italic markers are stripped.
- An empty value means "unknown", not "false" or "no". Never invent a value.
- `true` / `false` are booleans; `0` is a number, not a missing value.

### Tables

Every table uses the GitHub pipe format with a header row, a separator row, and
one row per item. Header names are fixed and case-sensitive.

```text
| Step ID | Time | Duration (min) | Title | Type | Location |
| --- | --- | --- | --- | --- | --- |
| step_03 | 18:00 | 90 | Hall Entrance | FLEXIBLE | Main Hall |
```

Rules:

- Do not merge cells, nest tables, or add a second header row.
- Every row must have the same number of cells as the header. Malformed rows are
  reported, never silently truncated.
- Empty cells are allowed and mean "not set".
- The order of rows is meaningful only where the schema says so (for example
  `speeches[].order`, `preWeddingTodos`).
- One table may appear inside a `###` sub-heading; it still belongs to the
  parent `##` section.

### Lists

- Only the `-` (or `*`) bullet list is parsed inside `## PRIVACY` and free-text
  sections.
- Numbered lists are display-only; use stable IDs in tables instead.
- Never rely on indentation to express hierarchy. Use separate tables or
  sub-headings.

### Code blocks

Verbatim speech scripts and JSON extensions use fenced blocks:

````text
```text
Drodzy Państwo, …
```
````

Rules:

- Speech text is copied **verbatim**; never summarize or rewrite it.
- The fence language is `text` for scripts and `json` for `## EXTENSIONS`.
- `##` lines inside a fence are content, not section markers.
- A single section may contain multiple code blocks.

---

## 3. Value conventions

### Identifiers

- `weddingId`: `YYYY-MM-DD_slug`, matching `dateISO` (D7 room key).
- Step ID: `step_NN`, lowercase, underscores, unique.
- Every checkable, referenceable or reorderable item has a stable ID:
  `anchorId`, `subtaskId`, `speechId`, `gameId`, `todoId`, `momentId`,
  `songId`, `courseId`.
- Never reuse an ID after deleting its row. The live state and mutation log may
  still reference it.
- References are by ID, never by display title: `stepId`, `anchorId`,
  `teleprompterRef`.

### Date and time

- `date`: `DD.MM.YYYY` (display).
- `dateISO`: `YYYY-MM-DD` (canonical, must match `date`).
- `syncPin`: `DDMM` of the date by default (D7). A different four-digit PIN is a
  warning, not an error.
- `time`, `cutoff`, `windowStart`, `windowEnd`, `serveTime`: `HH:MM` in the
  venue timezone. Never write "after dinner" or "4 hours before".
- Actual starts are ISO 8601 datetimes in the live state; the Doc only holds
  plans. After-midnight clocks (before 06:00) belong to the next service day.
- `cutoff` (absolute) wins over `cutoffSec` (relative to actual start).

### Languages and nationalities

- Content languages are ISO 639-1: `PL`, `FR`, `EN`.
- Nationalities are ISO 3166-1 alpha-2: `FR`, `PL`, `GB`.
- MC cues and teleprompter lines carry an explicit `lang`.
- UI language is per device and is **not** stored in the Doc.

### Booleans and enums

- Write `true` / `false` for booleans.
- Enum values are uppercase ASCII and come from the v1.2 proposal:
  `FLEXIBLE`, `HARD_ANCHOR`; `DEFAULT`, `RAIN`, `HEATWAVE`;
  `YES`, `NO`, `UNDECIDED`; `PHOTO`, `VIDEO`, `DRONE`; `MIDNIGHT`,
  `AFTER_CAKE`, `CUSTOM`.
- Never write Polish labels in enum cells; put the display text in the title or
  notes column.

### Privacy and scripts

- VIP alerts and vendor contacts are no longer part of the template or cartridge.
- Scripts follow speech consent: `consent: false` locks the script on the
  speaker device.

---

## 4. Section field map

Use the template as the authoritative example. The short map below explains the
non-obvious mappings.

### EVENT / COUPLE IDENTITY / LANGUAGES

| Doc field | Cartridge field |
| --- | --- |
| `Wedding ID` | `weddingId` |
| `Couple` | `couple` (display fallback) |
| `Bride first name`, `Bride nationality` | `coupleProfile.bride.firstName`, `.nationalities[]` |
| `Groom first name`, `Groom nationality` | `coupleProfile.groom.firstName`, `.nationalities[]` |
| `Shared languages` | `coupleProfile.commonLanguages[]` |
| `Default content` | `languages.defaultContent` |
| `Supported` | `languages.supported[]` |

### TIMELINE and its satellites

`TIMELINE` carries the step skeleton. Three satellite sections attach to it by
`Step ID`; never repeat step metadata in them.

| Section | Row key | Attaches to |
| --- | --- | --- |
| `DJ CUES` | `Step ID` | `steps[].dj` |
| `MC CUES` | `Step ID` | `steps[].mcCues[]` |
| `SUBTASKS` | `Step ID` + `Subtask ID` | `steps[].subTasks[]` |

`HARD ANCHORS` is its own list. A `HARD_ANCHOR` step must set `Anchor ID` to an
anchor that exists in the anchor table, and the anchor must exist for the step
(validation rule 3).

### OCZEPINY

Key/value fields map to `oczepiny.*`; the `### Sub-events` table maps to
`oczepiny.subEvents[]`. `Anchor ID` must reference `hardAnchors[].id` when
`Order` is `MIDNIGHT` (D5: Oczepini and Bread & Salt coexist).

### VIEW VISIBILITY

Only override rows. Each row maps to `viewVisibility[<role>][<section>]`.
Omit the whole section to keep the D1 defaults. All four roles
(`mc`, `dj`, `photo`) must exist in the final object; missing roles
default to all-false.

### MEDIA TEAM / PHOTO PLAN

`MEDIA TEAM` rows map to `mediaTeam[]`. `PHOTO PLAN` key/values map to
`photoPlan.*`; `### Group Photos` maps to `photoPlan.groupPhotos.groups[]`.
Sunset source is `ONLINE_API` only (D6); never write an estimated sunset.

### MUSIC POLICY / IMPORTANT SONGS / GUEST REQUESTS

`IMPORTANT SONGS` maps to `musicPolicy.importantSongs[]`.
`MUSIC POLICY` key/values plus the `### Must Play` and `### Do Not Play` tables
map to the rest of `musicPolicy`. `GUEST REQUESTS` maps to `requestsOpen` and
`requestWindow`. Reuse the same `id` when a song is both an important song and
a must-play entry.

### SPEECHES

The table maps to `speeches[]`. Each `### Speech Script <speech_id>` block maps
the fenced text to `speeches[].script.text` with `source: "GOOGLE_DOC"`. Missing
scripts are allowed unless `speechMode` requires them.

### CAKE / GAMES / KITCHEN

Direct table/key mapping to `cake`, `games` and `kitchen.*`. `GAMES` writes only
`YES`, `NO` or `UNDECIDED`; never infer consent from a mention elsewhere (see
`docs/optional-games.md`).

### PRE-WEDDING TODOS / PRIVACY

Direct mapping to `preWeddingTodos[]` and optional `privacy.*` encryption
metadata. Every todo row needs a stable ID.

### LIVE SYNC STATE / EXTENSIONS

`LIVE SYNC STATE` is a demo seed only; production state is generated at
runtime. `EXTENSIONS` is a JSON object and must stay empty for normal weddings.

---

## 5. Parser behaviour

`src/lib/googleDocTemplate.js` exports:

| Function | Result |
| --- | --- |
| `parseGoogleDocTemplate(text)` | `{ preamble, sections, byMarker, duplicates }` |
| `validateGoogleDocTemplate(parsed)` | `{ errors, warnings }` |
| `parseMarkdownTables(lines)` | `[{ header, rows }]` |
| `parseKeyValues(lines)` | `{ key: value }` |
| `parseBullets(lines)` / `parseCodeBlocks(lines)` | arrays |
| `sectionForMarker(marker)` | manifest entry or `null` |
| `canonicalSectionOrder()` | ordered marker list |

Each parsed section contains `marker`, `order`, `required`, `schemaPath`,
`startLine`, `raw`, `keyValues`, `tables`, `bullets`, `codeBlocks` and
`subSections`.

Error policy:

- **Error:** unknown marker, duplicate marker, missing required marker, lowercase
  marker, malformed table row.
- **Warning:** out-of-order sections, extra whitespace in a marker, missing
  optional section.
- The parser never invents data. A missing optional section leaves the
  corresponding cartridge block empty.
- The importer must validate the parsed structure before replacing the active
  wedding, exactly like the JSON importer.

Run the template check:

```bash
npm run validate:template
```

It asserts the exact marker set and order, and the fixed table header for every
section that has one.

---

## 6. Approval gate

This template is **not** wired into the v1.1 schema or
the runtime importer yet. When v1.2 is approved:

1. Add `schema/wedding-schema-v1.2.json`.
2. Regenerate `schema/google-doc-template.md` from the frozen schema.
3. Update `SECTION_MANIFEST.schemaPath` where the final field names differ.
4. Add the deterministic parser to the importer and map each section to its
   cartridge block.
5. Add fixtures: a filled template plus the expected v1.2 JSON.
6. Keep `npm run validate:template` green in CI.

Checklist:

- [ ] v1.2 schema approved and `schema/wedding-schema-v1.2.json` exists.
- [ ] Template markers and order match the frozen schema.
- [ ] Field map reviewed against the final validation rules.
- [ ] Parser fixtures cover every section and every error path.
- [ ] No VIP alert or vendor contact sections remain in the template.
- [ ] Google Doc converter wired into admin publishing after the schema is frozen.
