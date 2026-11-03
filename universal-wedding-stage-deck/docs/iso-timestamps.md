# ISO actual timestamps (TODO 23 / issue #65)

> **Status:** implemented in the app and v1.1-compatible. The v1.2 proposal
> renames the field to `liveSyncState.actualTimestamps`; v1.1 remains canonical
> until that proposal is approved.

Actual step starts are stored as **full ISO-8601 instants** internally. `HH:MM`
is only a display format. This removes the old ±12-hour fold limit, preserves
seconds, and gives the drift engine, reel clock and cutoff stopwatches an
absolute timeline.

## Storage shape

v1.1 cartridge / live state:

```json
"liveSyncState": {
  "actual_timestamps": {
    "step_01": "2026-08-20T14:31:00.000Z",
    "step_02": "2026-08-20T15:00:00.000Z",
    "step_03": "2026-08-20T16:25:00.000Z"
  }
}
```

v1.2 target (camelCase):

```json
"liveSyncState": {
  "actualTimestamps": {
    "step_01": "2026-08-20T14:31:00.000Z"
  }
}
```

Rules:

- Keys are step IDs, never labels.
- Values are ISO-8601 datetimes with seconds and an explicit offset or `Z`.
  New runtime writes use `now.toISOString()` (UTC `Z`).
- A value is an instant, not a wall clock. `2026-08-20T18:25:00+02:00` and
  `2026-08-20T16:25:00Z` are the same instant.
- Empty, null or malformed values are dropped during normalization.
- Display stays `HH:MM` in the **venue** timezone
  (`formatClockInZone`); `formatTimeOfDay(..., { seconds: true })` is available
  where seconds matter.

## Migration on load

`normalizeLiveState` (localStorage and remote sync) calls
`migrateActualTimestamps` from [`src/lib/eventTime.js`](../src/lib/eventTime.js):

1. ISO input is parsed and re-serialized as UTC ISO, preserving the instant and
   seconds.
2. Legacy `HH:MM` or `HH:MM:SS` is interpreted on the event date
   (`dateISO` → `weddingId` prefix → `date` `DD.MM.YYYY`).
3. A clock before **06:00** belongs to the next service day, so `00:30` on a
   20 August wedding becomes `2026-08-21T00:30` in the venue timezone. This is
   the after-midnight rule used by Oczepiny.
4. DST is resolved with a two-pass offset calculation, so a migration across a
   spring/autumn change keeps the intended wall clock.
5. If the event date is unknown, the raw value is kept instead of guessing;
   the normalizer never invents data.

The same migration runs for:

- the saved localStorage state on boot,
- a remote Supabase row before it is adopted,
- cross-tab `storage` events,
- an imported cartridge seed,
- the CLI below.

After a load, the normalized state is persisted again by the existing
`saveLiveState` effect, so a device upgrades itself once.

## Runtime writes

Every transition writes ISO, never a clock string:

- `markStepDone` → actual start of the next step,
- `swapStepWithNext` → swapped-in step start,
- `deferStepToJoker` / restore,
- live-state seeds using `now.toISOString()`.

Undo deletes the affected timestamp, so the next start is recorded cleanly.

## Why the ±12h fold limit disappears

`clockDeltaMinutes` still folds two `HH:MM` strings to the shorter path because
a bare clock has no date. The drift engine does **not** use it for ISO actuals:

- `buildTimeline` parses `actualTimestamp` with `isIsoTimestamp` and compares
  absolute instants for actual-vs-planned drift.
- `computeStepDriftMinutes(step, actualStart, context)` accepts an ISO actual
  plus `{ eventDateISO, timeZone }` and computes the real minute delta.
- The reel clock and cutoff stopwatch use the absolute `actualDate`.
- A 23:50 plan with a 01:10 actual is now `+80m`, not `-1360m`.
- Seconds survive the round trip; display rounds only at the final format step.

## CLI migration

[`scripts/migrate-actual-timestamps.mjs`](../scripts/migrate-actual-timestamps.mjs)
upgrades a cartridge file or a saved cartridge library before v1.2 rollout.

```bash
npm run migrate:timestamps -- path/to/cartridge.json
npm run migrate:timestamps -- path/to/cartridge.json --write
npm run migrate:timestamps -- path/to/cartridge.json --check
```

- Default is a dry run that prints `from -> to` for each changed step.
- `--write` rewrites the JSON in place with a trailing newline.
- `--check` exits `1` when any timestamp still needs migration (CI guard).
- Handles both `actual_timestamps` and `actualTimestamps`.
- Fails with exit code `2` when it cannot resolve the event date or there is no
  live-state block.

## Schema notes

- v1.1 `$defs.actualTimestamp` accepts either a full ISO datetime or a legacy
  `HH:MM` clock. Both validate; the app normalizes the legacy form on load.
- v1.2 should require the ISO form and rename `actual_timestamps` to
  `actualTimestamps` as part of the camelCase migration. The app already reads
  and writes the ISO shape, so only the key rename remains for that release.
- The optional `liveSyncState` in a cartridge is a seed. Runtime state is
  normalized again regardless of the seed's shape.

## Edge cases covered

| Input | Result |
| --- | --- |
| `2026-08-20T18:25:00+02:00` | `2026-08-20T16:25:00.000Z` |
| `18:25` on 2026-08-20, Europe/Warsaw | `2026-08-20T16:25:00.000Z` |
| `00:30` on 2026-08-20, Europe/Warsaw | `2026-08-20T22:30:00.000Z` (next service day) |
| `18:25:42` | seconds preserved |
| `` / `null` / invalid | dropped |
| unknown event date | raw value kept; no guess |
| exact duplicate instants with different offsets | same instant |

## Verification checklist

- [ ] Load a v1.1 cartridge with `HH:MM` actuals → state stores ISO.
- [ ] Reload → no further migration, no timestamp drift.
- [ ] Remote state with legacy clocks → normalized on adoption.
- [ ] Cross-midnight actual shows the correct positive drift.
- [ ] Seconds survive save/load and display when requested.
- [ ] `npm run migrate:timestamps -- fixture.json --check` fails before and
      passes after `--write`.
- [ ] `npm run validate:schema` still accepts ISO and legacy v1.1 cartridges.
