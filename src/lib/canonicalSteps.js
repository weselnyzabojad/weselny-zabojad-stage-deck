// Issue #1329 / decision 17.143: the frozen 19-step customer timeline catalog.
// Issue #1374: the catalog lives in `schema/canonical-steps.json` so the admin
// editor and Edge functions can consume the same source of truth.

import catalog from '../../schema/canonical-steps.json' with { type: 'json' };

export const CANONICAL_STEPS = Object.freeze(
  catalog.steps.map((step) =>
    Object.freeze({
      id: step.id,
      name: step.name,
      type: step.type,
      optionalFlag: step.optionalFlag ?? null,
      anchorId: step.anchorId ?? null,
      isMainSongRequired: step.isMainSongRequired === true,
      exampleHour: step.exampleHour,
      exampleValues: step.exampleValues,
    }),
  ),
);

const BY_NAME = new Map(CANONICAL_STEPS.map((step) => [step.name.toLowerCase(), step]));
const BY_ID = new Map(CANONICAL_STEPS.map((step) => [step.id, step]));

export const TIMELINE_COLUMNS = Object.freeze([...catalog.columns]);

export function canonicalStepByName(name) {
  return BY_NAME.get(String(name ?? '').trim().toLowerCase()) ?? null;
}

export function canonicalStepById(id) {
  return BY_ID.get(String(id ?? '').trim()) ?? null;
}

export function timelineMarkdownRows() {
  return CANONICAL_STEPS.map(
    (step) => `| ${step.exampleHour} | ${step.name} | ${step.exampleValues} |`,
  );
}
