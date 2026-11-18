// Venue Policy Guard contract and pure guard logic (issue #1195).
//
// Policies live in live-state overrides, never in the Google Doc. Tags are
// entered by the Venue Manager; the guard only reports causes, never UI copy.

export const FORBIDDEN_FX = Object.freeze(['smoke', 'haze', 'sparks']);
export const STEP_TAGS = Object.freeze([
  'HIGH_INTENSITY',
  'SMOKE',
  'HAZE',
  'SPARKS',
]);

const TAG_TO_FX = Object.freeze({
  SMOKE: 'smoke',
  HAZE: 'haze',
  SPARKS: 'sparks',
});

export const VENUE_POLICY_DEFAULTS = Object.freeze({
  decibelLimitEnabled: false,
  decibelLimit: null,
  forbiddenFx: Object.freeze([]),
});

export function normalizeStepTags(tags) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  return tags.filter((tag) => {
    if (!STEP_TAGS.includes(tag) || seen.has(tag)) return false;
    seen.add(tag);
    return true;
  });
}

export function normalizeVenuePolicies(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...VENUE_POLICY_DEFAULTS, forbiddenFx: [] };
  }
  const limit = Number.isFinite(raw.decibelLimit) && raw.decibelLimit > 0
    ? Math.round(raw.decibelLimit)
    : null;
  const forbiddenFx = Array.isArray(raw.forbiddenFx)
    ? raw.forbiddenFx.filter((fx, index, list) => FORBIDDEN_FX.includes(fx) && list.indexOf(fx) === index)
    : [];
  return {
    decibelLimitEnabled: raw.decibelLimitEnabled === true && limit != null,
    decibelLimit: limit,
    forbiddenFx,
  };
}

export function venuePolicyWarnings(stepTags, rawPolicies) {
  const policies = normalizeVenuePolicies(rawPolicies);
  const tags = normalizeStepTags(stepTags);
  const warnings = [];

  if (tags.includes('HIGH_INTENSITY') && policies.decibelLimitEnabled) {
    warnings.push({
      type: 'redline',
      decibelLimit: policies.decibelLimit,
      advice: { masterDb: -3 },
    });
  }

  for (const tag of tags) {
    const effect = TAG_TO_FX[tag];
    if (effect && policies.forbiddenFx.includes(effect)) {
      warnings.push({ type: 'dmx-lock', effect });
    }
  }

  return { policies, warnings };
}
