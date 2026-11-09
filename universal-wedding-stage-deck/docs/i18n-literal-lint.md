# Hardcoded UI literal lint (proposal)

`npm run validate:i18n` only checks that the `en`/`fr`/`pl` dictionaries have
matching keys and placeholders. It cannot detect a JSX string that never calls
`t()`. This document proposes the follow-up lint; the lint itself is tracked
separately because it needs parser-level rules and a baseline sweep.

## Rule

Flag user-facing English text that reaches the DOM without `t()`:

- JSX text nodes with at least two ASCII letters, for example
  `<span>Real start</span>`.
- String literals assigned to user-facing attributes: `aria-label`, `title`,
  `alt`, `placeholder`, `label`, `description`, and button text props.
- Template literals that interpolate and produce UI copy without `t()`.

## Scope

`src/views/**`, `src/components/**` and `src/admin/**` (`.jsx`, `.js`).

Exempt:

- dictionary files (`src/i18n/*.js`);
- class names, `data-*` attributes, `id`, `key`, `href`, URLs and test ids;
- decorative emoji / symbols inside `aria-hidden` nodes;
- machine enums and cartridge content (step types, role ids, song titles);
- intentional brand strings and the `Weselny Żabojad` alt text;
- comments and console/log strings.

## Suggested implementation

1. Use the existing `oxlint` dependency with a small local rule (or a standalone
   `scripts/check-ui-literals.mjs` using the Babel/JSX parser already available
   through Vite).
2. Report `file:line` plus the literal and the owning component.
3. Start with a checked-in baseline allowlist so the first CI run is green, then
   shrink the allowlist as files are converted.
4. Expose it as `npm run validate:literals`.

## CI hook

Add `npm run validate:literals` next to the existing steps in the
`Schema, fixtures, tests and build` workflow (`.github/workflows/`) after
`validate:i18n`, so a hardcoded UI string fails the same required check as an
incomplete translation dictionary.

## Current status

The BottomNav labels from issue #429 are already resolved through `t()`; the
only literals left there are role identity keys. The broader sweep should be a
separate change so this fix stays scoped.
