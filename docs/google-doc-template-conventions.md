# Google Doc template conventions (v1.1 / issue #70)

> **Status: current.** These conventions describe the v1.1 customer template
> shipped with the first release. `schema/wedding-schema-v1.1.json` is the
> canonical contract for that release.

The couple writes one Google Doc per wedding. The importer maps that Doc to a
`WeddingSchema v1.1` cartridge deterministically, without an AI guess, by
reading:

1. stable `## SECTION` markers,
2. fixed `Field | Your value | Example` tables,
3. fixed repeating-table business headers,
4. fenced text blocks for verbatim scripts.

Files:

| File | Purpose |
| --- | --- |
| [`schema/google-doc-template.md`](../schema/google-doc-template.md) | Copy-paste template for the couple. |
| [`src/lib/googleDocTemplate.js`](../src/lib/googleDocTemplate.js) | Section manifest + pure parser/validator. |
| [`scripts/validate-google-doc-template.mjs`](../scripts/validate-google-doc-template.mjs) | CI-style check: `npm run validate:template`. |

The deterministic Google Doc converter and parser target the v1.1 runtime
contract. This template and the field map are the customer-facing v1.1
contract.

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
| 1 | `## EVENT` | yes | `weddingId`, `date`, `dateISO`, `syncPin`, `servicePackage` |
| 2 | `## COUPLE IDENTITY` | yes | `coupleProfile` |
| 3 | `## LANGUAGES` | yes | `languages` |
| 3.5 | `## DEMOGRAPHICS` | no | `demographics` |
| 4 | `## CULTURAL RULES` | yes | `culturalRules` |
| 5 | `## OCZEPINY` | no | `oczepiny` |
| 6 | `## TIMELINE` | yes | `steps` |
| 7 | `## DJ CUES` | no | `steps[].dj` |
| 8 | `## NOTES` | no | `steps[].notes` |
| 9 | `## SUBTASKS` | no | `steps[].subTasks` |
| 10 | `## HARD ANCHORS` | no | `hardAnchors` |
| 11 | `## VENUE LOGISTICS` | no | `venueDetails` domain contract only (not a cartridge field) |
| 12 | `## VIEW VISIBILITY` | yes | `viewVisibility` |
| 13 | `## MEDIA TEAM` | no | `mediaTeam` |
| 14 | `## PHOTO PLAN` | no | `photoPlan` |
| 15 | `## IMPORTANT SONGS` | no | `musicPolicy.importantSongs` |
| 16 | `## MUSIC POLICY` | no | `musicPolicy` |
| 17 | `## GUEST REQUESTS` | no | `musicPolicy.requestWindow`, `requestsOpen` |
| 18 | `## SPEECHES` | no | `speechMode` |
| 19 | `## CAKE` | no | `cake` |
| 20 | `## GAMES` | no | `steps[].game` |
| 21 | `## KITCHEN` | no | `kitchen` |
| 22 | `## PRE-WEDDING TODOS` | no | `preWeddingTodos` |
| 24 | `## LIVE SYNC STATE` | no | `liveSyncState` (demo seed only) |
| 25 | `## EXTENSIONS` | no | `extensions` |
| 26 | `## MANDATORY STEPS` | no | `steps[].mandatory` |
| 29 | `## WITNESSES` | no | `witnesses` |

The machine-readable source of truth is `SECTION_MANIFEST` in
`src/lib/googleDocTemplate.js`. The template validator fails if a marker is
missing, duplicated, unknown, out of order, or has the wrong table header.

`## DEMOGRAPHICS` is optional. It accepts `Guests total`, `Guests PL`,
`Guests FR`, `Guests other` and `Notes`. Counts must be non-negative whole
numbers; missing or invalid counts stay absent (never zero) and invalid values
raise an import warning. Guest notes come only from the `Notes` key under
`## DEMOGRAPHICS`; privacy settings are app-owned and never Doc-sourced.

---

## 2. Formatting rules

### Fixed-field tables

Every fixed field is one row in a three-column table. The header is exactly
`Field | Your value | Example` and is case-sensitive.

```text
| Field | Your value | Example |
| --- | --- | --- |
| Date | 20.08.2026 | DD.MM.YYYY |
| Children expected | yes | yes or no |
```

Rules:

- `Field` is the exact English label shown in the template. Never rename it.
- `Your value` is the only value the importer reads.
- `Example` is reference-only. It is never parsed and never sets a cartridge
  value.
- Empty `Your value` cells mean "unknown", not "false" or "no". Never invent a
  value.
- `true` / `false` are booleans; `0` is a number, not a missing value.
- The first colon inside a value belongs to the value; field labels do not use
  colons.
- Surrounding backticks and bold/italic markers are stripped from values.

The fixed-field sections are `EVENT`, `COUPLE IDENTITY`, `LANGUAGES`,
`DEMOGRAPHICS`, `OCZEPINY`, `VENUE LOGISTICS`, `MUSICIANS`, `PHOTO PLAN`,
`MUSIC POLICY`, `GUEST REQUESTS`, `SPEECHES`, `CAKE`, `MANDATORY STEPS`,
`KITCHEN` -> `Dietary Counts`, and `CEREMONY SCRIPT`.

### Tables

Every table uses the GitHub pipe format with a header row, a separator row, and
one row per item. Header names are fixed and case-sensitive.

Fixed fields use the three-column `Field | Your value | Example` table above.
Repeating sections keep their business columns (for example `Hour | Step name |
Example values` or `Step name | Playlist | Track | Cutoff | Note`) and start
with a short instruction to replace the example rows. Repeating table rows are
examples until the couple replaces or deletes them; no row is treated as a
default value.

```text
| Hour | Step name | Example values |
| --- | --- | --- |
| 18:00 | Grand Entrance | Guest order, entrance music |
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

- Only the `-` (or `*`) bullet list is parsed inside free-text sections.
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

- `weddingId`: `Name&Name-UM-YYYY-MM-NNN`, e.g.
  `Weronika&Guillaume-UM-2027-04-002`, matching
  `^[A-Za-z0-9&]+-UM-\d{4}-\d{2}-\d{3}$` (D7 room key). The prefix is
  filename-safe; spaces, accents, slashes and the old `YYYY-MM-DD_slug` format
  are rejected. `room_code` and `/deck/<room_code>/<role>` stay unchanged. The
  old format was development-only; no production wedding needs a migration.
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
- `time`, `cutoff`, `windowStart`, `windowEnd`: `HH:MM` in the venue timezone.
  Never write "after dinner" or "4 hours before".
- Actual starts are ISO 8601 datetimes in the live state; the Doc only holds
  plans. After-midnight clocks (before 06:00) belong to the next service day.
- `cutoff` is an absolute clock; relative cutoff offsets are not part of the cartridge.

### Languages and nationalities

- Content languages are ISO 639-1: `PL`, `FR`, `EN`.
- Nationalities are ISO 3166-1 alpha-2: `FR`, `PL`, `GB`.
- MC cues and teleprompter lines carry an explicit `lang`.
- UI language is per device and is **not** stored in the Doc.

### Booleans and enums

- Write `true` / `false` for booleans.
- Enum values are uppercase ASCII and come from the v1.1 contract:
  `FLEXIBLE`, `HARD_ANCHOR`; `DEFAULT`, `RAIN`, `HEATWAVE`;
  `YES`, `NO`, `UNDECIDED`; `PHOTO`, `VIDEO`, `DRONE`; `MIDNIGHT`,
  `AFTER_CAKE`, `CUSTOM`; `OFF`, `LIGHT`, `COMPLEX`.
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
| `Wedding ID` | `weddingId` (admin context; not a Doc field) |
| `Venue` (VENUE LOGISTICS) | `venueDetails.venue` (domain mapping only) |
| `Nationality` under `### Bride` | `coupleProfile.bride.nationalities[]` |
| `Spoken languages` under `### Bride` | `coupleProfile.bride.spokenLanguages[]` |
| `Nationality` under `### Groom` | `coupleProfile.groom.nationalities[]` |
| `Spoken languages` under `### Groom` | `coupleProfile.groom.spokenLanguages[]` |
| Bride/groom first names | `coupleProfile.*.firstName` (admin context; not a Doc field) |
| `Host languages` | `languages.hostLanguages[]` |
| Shared languages | `coupleProfile.commonLanguages[]` (computed intersection) |

### TIMELINE and its satellites

`TIMELINE` is the fixed three-column catalog: `Hour`, `Step name` and
`Example values`. The Step name is the canonical customer-facing key; internal
step IDs live in `src/lib/canonicalSteps.js` and are never edited by the couple.
Keep only the hours and row presence: change an hour, reorder rows for
presentation, or delete a row to exclude that step. A remaining blank or invalid
hour is an import error. `Example values` is read-only guidance and is never
parsed.

Three satellite sections attach by the canonical `Step name`; never repeat step
metadata in them. A missing, unknown or deleted Step name is warned and the row
is dropped without creating a step or cue.

| Section | Row key | Attaches to |
| --- | --- | --- |
| `DJ CUES` | `Step name` | `steps[].dj` |
| `MC CUES` | `Step name` | `steps[].mcCues[]` |
| `SUBTASKS` | `Step name` + `Label` | `steps[].subTasks[]`; IDs generated as `stepId + "_" + slug(label)` |

`HARD ANCHORS` is its own list. A `HARD_ANCHOR` step must set `Anchor ID` to an
anchor that exists in the anchor table, and the anchor must exist for the step
(validation rule 3).

### CULTURAL RULES / OCZEPINY

`CULTURAL RULES` uses `Rule | Status | Example`. The Example cells are empty in
the template; when filled, the `breadSalt` example maps to
`culturalRules.bread_salt.note`.

Oczepiny fixed fields map to `oczepiny.*`. `Order` accepts `MIDNIGHT` or
`EARLY`; `Toss` accepts `VEIL` or `BOUQUET`; `Ties` accepts `BOW_TIE` or
`CRAVAT`. `Countdown mode` accepts `SONGS` or `MC_MIC_COUNTDOWN`. `songs` is a
semicolon-separated list for `SONGS`; `default` maps to an empty list with
`music.decidedByDj = true`. The fixed sub-event list is derived, not authored.
`anchorId` and the winner-photo cue are app/admin data, never Doc values. The
MIDNIGHT anchor still comes from the timeline step and hard-anchor table (D5:
Oczepini and Bread & Salt coexist).

### VIEW VISIBILITY

Only override rows. Each row maps to `viewVisibility[<role>][<section>]`.
Omit the whole section to keep the D1 defaults. All four roles
(`mc`, `dj`, `photo`) must exist in the final object; missing roles
default to all-false.

### MEDIA TEAM / PHOTO PLAN

`MEDIA TEAM` rows map to `mediaTeam[]`; IDs are generated as
`role + "_" + slug(name)`. `PHOTO PLAN` fixed fields map to
`photoPlan.*`; `### Group Photos` is `Label | Note` and maps to
`photoPlan.groupPhotos.groups[]` in document order. Group IDs are generated from
the label with duplicate suffixes; the note is optional. `Group photos step ID`
optionally binds the list to the group-photo timeline step. Group-photo timing
comes from that step's planned time; `minGroupSize` and duration are not used as
gates. Sunset source is `ONLINE_API` only (D6); never write an estimated sunset.

### MUSIC POLICY / IMPORTANT SONGS / GUEST REQUESTS

`IMPORTANT SONGS` maps to `musicPolicy.importantSongs[]`; the song `id`,
`moment`, `title`, `artist` and `source.type` are required, while `stepId` and
the request open/window settings are app/admin data and are never read from the
Doc. `MUSIC POLICY` fixed-field table plus the `### Must Play` and `### Do Not Play`
tables map the remaining Doc-sourced fields. `GUEST REQUESTS` supplies the
request rules only. Reuse the same `id` when a song is both an important song
and a must-play entry.

### SPEECHES

`Speech mode` maps to the wedding-level `speechMode` and accepts exactly `OFF`,
`LIGHT` or `COMPLEX`. The parser normalizes case to uppercase and rejects any
other value. When present, the Doc value is authoritative; the admin mode is a
read-only display, so changing it requires editing the Doc and re-parsing. Only
`COMPLEX` authorizes creating speech Docs and folders. When the section exists
but the value is missing or invalid, the parser warns and leaves `speechMode`
unset; an older Doc without the field follows the same rule. There is no silent
`OFF` default and no inference from another value.

The main wedding Doc no longer maps a `speeches[]` array. Table rows under
`## SPEECHES` stay documentation only. Speech records and scripts live in the
dedicated encrypted bundle and are created from separate per-speech Docs
(`SPEAKER [xx]` / `MC [yy]` labels). Parsing produces no Drive reads, folder
creation or Doc creation.

### CAKE / GAMES / KITCHEN

Direct fixed-field table mapping to `cake`, `steps[].game` and `kitchen.*`. `GAMES` writes only
`YES`, `NO` or `UNDECIDED`; never infer consent from a mention elsewhere (see
`docs/optional-games.md`).

`## KITCHEN → Courses` is the only kitchen course table:
`Course ID | Name | Time | Service Mode | Dietary notes`. `Service Mode` accepts
`TABLE_SERVICE` or `BUFFET`. Remove the old `## MANDATORY STEPS → Kitchen
Services` table. First guests arrival, closure and closure extension stay in
`## MANDATORY STEPS`.

`## CAKE → Time` is the cake source of truth. `## KITCHEN` times are the kitchen
source of truth. A differing `## TIMELINE` time warns; the section value wins.

### PRE-WEDDING TODOS

Direct mapping to `preWeddingTodos[]`. Every todo row needs a stable ID.

### Privacy and live state

`## PRIVACY` is no longer a valid Doc marker. Privacy and encryption metadata
come from `PRIVACY_CONFIG` in `src/config/privacy.js`; a Doc that still contains
the section fails validation with a migration message.

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
| `parseFieldValues(tables)` | `{ field: value }` from `Field \| Your value \| Example` tables |
| `validateFieldTables(parsed)` | `[error]` for old, missing, duplicate or unknown fixed-field labels |
| `FIELD_MANIFEST` | required labels per fixed-field section |
| `parseKeyValues(lines)` | `{ key: value }` (legacy format; rejected by the v1.1 parser) |
| `parseBullets(lines)` / `parseCodeBlocks(lines)` | arrays |
| `sectionForMarker(marker)` | manifest entry or `null` |
| `canonicalSectionOrder()` | ordered marker list |

Each parsed section contains `marker`, `order`, `required`, `schemaPath`,
`startLine`, `raw`, `keyValues` (fixed-field table values plus legacy key/value
lines), `tables`, `bullets`, `codeBlocks` and `subSections`.

Error policy:

- **Error:** unknown marker, duplicate marker, missing required marker, lowercase
  marker, malformed table row.
- **Error:** an old `Field: value` line in a fixed-field section. The message
  names the section and field and points to the migration procedure below.
- **Error:** a missing, duplicate or unknown label in a fixed-field table. The
  message names the section and label.
- **Warning:** out-of-order sections, extra whitespace in a marker, missing
  optional section.
- The parser never invents data. A missing optional section leaves the
  corresponding cartridge block empty.
- The importer must validate the parsed structure before replacing the active
  wedding, exactly like the JSON importer.

### Migrating an existing Doc

The v1.1 contract accepts only the table format. There is no silent fallback to
`Field: value` lines.

1. Copy the current `schema/google-doc-template.md` into a new Google Doc.
2. Copy each value from the old Doc into the matching `Your value` cell, or the
   matching repeating-table row. Keep existing IDs and canonical `Step name`
   values.
3. Delete every old `Field: value` line and every old example row you replaced.
4. Keep the `## SECTION` markers and fixed table headers unchanged.
5. Run `npm run validate:template` on the saved markdown and re-import.

Old-format Docs fail with an error that names the section and the first
offending field instead of importing partial data.

Run the template check:

```bash
npm run validate:template
```

It asserts the exact marker set and order, and the fixed table header for every
section that has one.

---

## 6. Canonical step vocabulary & Plan-of-the-day transcription

### 6.1 Canonical step vocabulary

The timeline ships with one row per step from the frozen 19-step catalog in
`src/lib/canonicalSteps.js`. The canonical names are the customer-facing key;
localized display text belongs in notes, never in the Step name. Example values
are read-only guidance and are never parsed.

| Canonical step | Fixed metadata |
| --- | --- |
| Vin d'honneur / Cocktail | FLEXIBLE |
| Ceremony | FLEXIBLE; `ceremony` details from `## EVENT` |
| Grand Entrance | FLEXIBLE; `grandEntranceOrder` from notes |
| Dinner | FLEXIBLE; kitchen metadata when present |
| Wedding Cake | HARD_ANCHOR |
| Wedding Thank-You | FLEXIBLE |
| Wishes | FLEXIBLE |
| First Dance | FLEXIBLE; `firstDanceMode` from notes |
| Oczepiny | HARD_ANCHOR, `optionalFlag: oczepiny` |
| Test Wiedzy | FLEXIBLE; game question list |
| Test Zgodności | FLEXIBLE; game question list |
| Musical Set | FLEXIBLE, `optionalFlag: dj_set` |
| Bread & Salt | FLEXIBLE |
| Dance with Bride and Groom | FLEXIBLE |
| Supper I / II / III | FLEXIBLE; kitchen metadata when present |
| Speed Foto | FLEXIBLE |
| Last Dance | FLEXIBLE |

Guest-flow moments (guest check-in, moving to the orangery, taking seats) are
venue notes, not timeline steps.

### 6.2 Plan-of-the-day transcription

A free-form "Plan of the day" is a list of time blocks with lettered bullets
(`a.`, `b.`, …). Each block is one step (its hour is the step `Time`); each
lettered bullet is transcribed to exactly one structured table:

- a **checkable to-do** → a `SUBTASKS` row (`step.subTasks`);
- an **instruction the MC announces or performs** → an `MC CUES` row
  (`step.mcCues`);
- a bullet that begins `Song -` → a `DJ CUES` row (`step.dj.track`).

Never keep the letters in the template; the importer reads only the stable
tables. Anything that is neither a subtask, a cue nor a song stays as a `Notes`
cell or a venue-logistics note — it is never dropped silently.

Example (Grand Entrance):

```text
16:00  Ilona and Adrien Enter the Room
o. Guests use napkins (serviettes) for an Italian welcome
   — with explanations of Sto lat in French
p. Song — ABBA — Gimme! Gimme! Gimme!
q. Toast and throwing glass behind
r. Sto lat singing
```

becomes one `TIMELINE` row titled `Grand Entrance` (16:00), two `SUBTASKS` rows
(napkin welcome; Sto lat explanation), one `DJ CUES` row (ABBA), and `NOTES`
rows for the toast, Sto lat and glass-toss reminders.

### 6.3 Uniform fallback rules

Every field that fails to map cleanly is handled the same way — never silently
invented and never a per-file special case:

- **Missing / ambiguous start time.** A step without a parseable `HH:MM` is an
  error; the importer never invents a time. A range (`15:40/16:00`,
  `22:00-22:30`, `18:00–20:00`) maps to its **first** clock (the planned start);
  the remainder is kept in the step `Notes`.
- **Clock normalization.** The importer accepts `HH:MM`, `HH.MM` (`22.15`) and
  `HHhMM` (`15h00`) and normalizes them to `HH:MM`. After-midnight clocks
  before `06:00` belong to the next service day.
- **Unstructured notes.** A bullet that is neither a subtask, an MC cue nor a
  `Song -` becomes a step `Notes` line or an MC cue with its original language —
  never dropped silently.
- **Missing duration.** Durations stay derived from the next step's time (and the
  closure time for the final step); never hardcoded per file.
- **Malformed rows / unknown markers.** Already fail validation; the same policy
  extends to any new section (kitchen course list, ceremony script).

---

## 7. Release contract (v1.1)

The first release ships `WeddingSchema v1.1`; no follow-up schema version ships
in that release. This template, these conventions and
`schema/google-doc-field-map.json` are the v1.1 customer contract, kept green by
`npm run validate:template` and `npm run validate:google-doc-map`.

Checklist:

- [x] Template markers and order match `SECTION_MANIFEST`.
- [x] Field map reviewed against the v1.1 schema.
- [x] Parser fixtures cover every section and error path.
- [x] No VIP alert or vendor contact sections remain in the template.
