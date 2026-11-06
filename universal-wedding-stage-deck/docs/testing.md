# Testing and schema fixtures (TODO 14 / issue #57)

The repo now has a repeatable schema/fixture suite plus Vitest for the shared
pure modules. CI runs the same commands locally documented here.

## Commands

```bash
npm run validate:schema      # canonical example cartridge
npm run validate:fixtures    # every schema/fixtures/*.json
npm test                     # Vitest, run once
npm run test:watch           # Vitest watch mode
npm run lint
npm run build
```

`validate:schema` still accepts a path:

```bash
npm run validate:schema -- schema/fixtures/real-jennifer-guillaume.json
```

## Fixture contract

All fixtures live in [`schema/fixtures/`](../schema/fixtures/) and are named by
their expected result:

| Prefix | Expected result | Purpose |
| --- | --- | --- |
| `valid-` | must pass | One focused edge case per file |
| `real-` | must pass | A real wedding cartridge, committed with approval |
| `invalid-` | must fail | One rule/edge case per file |

`node schema/validate-fixtures.mjs` enforces the contract and also requires at
least one file in each category. It prints the first rejection reason for every
invalid fixture, so a fixture that fails for the wrong reason is easy to spot.
`tests/schema-fixtures.test.js` additionally pins the intended error text.

## Current coverage

Valid edge cases:

- `valid-minimal.json` — only required top-level fields.
- `valid-midnight.json` — steps after midnight, a `00:00` hard anchor and ISO
  actual timestamps.
- `valid-buffers.json` — buffer bounds and a hard-anchor step.
- `valid-speeches.json` — `speechMode`, unique speech order, complex/light
  scripts.
- `valid-music.json` — important songs, must/do-not-play, request window,
  customer-file and streaming sources.
- `valid-photo-oczepiny.json` — media team, sunset + mini session, fire safety,
  group photos, MIDNIGHT Oczepiny with an anchor.
- `valid-iso-timestamps.json` — ISO actual timestamps in live state.

Real wedding:

- `real-jennifer-guillaume.json` — the canonical Jennifer & Guillaume cartridge
  (5 steps, 3 hard anchors).

Invalid edge cases:

- duplicate step IDs,
- unknown live-state step references,
- inverted buffer bounds / out-of-range duration,
- cake served before cutting,
- reversed music request window,
- MIDNIGHT Oczepiny without an anchor,
- fire effects without permit/approval/briefing,
- duplicate speech order,
- a key song pointing at an unknown step,
- an unknown top-level field,
- a malformed ISO timestamp,
- a missing cultural rule,
- an invalid sync PIN.

## Vitest suites

| File | Covers |
| --- | --- |
| `tests/schema-fixtures.test.js` | All fixtures, expected error reasons, real-wedding stability, canonical example |
| `tests/validation-rules.test.js` | Semantic rules directly: IDs, refs, buffers, cake, music, Oczepiny, photo safety, speeches, song refs, counts, ISO/legacy timestamps |
| `tests/iso-timestamps.test.js` | ISO round-trips, legacy migration, after-midnight rollover, map filtering |

Vitest runs in a Node environment (`vitest.config.js`) because the current suite
tests the schema and pure helpers. Browser/component tests can be added later
with a DOM environment without changing the command.

## Adding a fixture

1. Start from `valid-minimal.json` or a real wedding fixture.
2. Change exactly one thing per `invalid-` fixture.
3. Use the correct prefix.
4. Add the expected error substring to `EXPECTED_INVALID_REASONS` in
   `tests/schema-fixtures.test.js`.
5. Run `npm run validate:fixtures && npm test`.

For a real wedding:

- get explicit approval to commit the cartridge,
- remove/replace sensitive VIP notes if the copy is only for schema coverage,
- keep the fixture deterministic (no live API data, no runtime values),
- add it with the `real-` prefix and keep its ID/date.

## CI

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on pushes and pull
requests to `master`, from the repository root with
`working-directory: universal-wedding-stage-deck`:

1. `npm ci`
2. `npm run lint`
3. `npm run validate:schema`
4. `npm run validate:fixtures`
5. `npm test`
6. `npm run validate:template`
7. `npm run build`

The canonical `npm run validate:schema` step is always present, so the same
contract used by the browser importer is checked in CI before the fixture suite.

## Follow-ups

- Add browser/component tests with a DOM environment for import preview and
  live-state transitions.
- Add a Playwright smoke test for pairing, advancing a step and recovering from
  a sync failure.
- Add one fixture per future real wedding, never per demo variation.
