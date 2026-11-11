// Admin-only helpers for the two media leave milestones. The published
// cartridge remains the source of truth; these helpers only locate and patch
// the existing MILESTONE steps.
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const KINDS = [
  { key: 'photo', milestoneKind: 'PHOTO', label: 'Photographer leaves' },
  { key: 'camera', milestoneKind: 'CAMERA', label: 'Cameraman leaves' },
];

function findStep(cartridge, milestoneKind) {
  const steps = Array.isArray(cartridge?.steps) ? cartridge.steps : [];
  return (
    steps.find(
      (step) =>
        step?.mandatory?.kind === 'MILESTONE' &&
        step.mandatory.milestoneKind === milestoneKind,
    ) ?? null
  );
}

export function readMediaLeaveTimes(cartridge) {
  return Object.fromEntries(KINDS.map(({ key, milestoneKind }) => [key, findStep(cartridge, milestoneKind)?.time ?? '']));
}

export function applyMediaLeaveTimes(cartridge, times = {}) {
  if (!cartridge || typeof cartridge !== 'object') {
    return { cartridge: null, errors: ['Cartridge is not available.'] };
  }

  const next = structuredClone(cartridge);
  const errors = [];

  for (const { key, milestoneKind, label } of KINDS) {
    const value = typeof times[key] === 'string' ? times[key].trim() : '';
    if (!value) continue;
    if (!TIME_PATTERN.test(value)) {
      errors.push(`${label}: enter a valid HH:MM time.`);
      continue;
    }
    const step = findStep(next, milestoneKind);
    if (!step) {
      errors.push(`${label}: no matching milestone step exists in this cartridge.`);
      continue;
    }
    step.time = value;
  }

  return { cartridge: next, errors };
}
