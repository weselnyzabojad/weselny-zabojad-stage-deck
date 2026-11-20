// Guards for live schedule mutations (P0.7 / Phase 2).
//
// Hard anchors (vendor departures, midnight Oczepini, transport) must never
// move. Steps that carry a photographer cue may move only after an
// explicit warning because a vendor is waiting for that moment.

export function stepHasPhotographerCue(step) {
  if (!step || typeof step !== 'object') return false;
  return Boolean(
    step.photographerCue ||
      step.photoCue ||
      step.mediaCue ||
      step.photo?.cue ||
      step.media?.photographerCue,
  );
}

export function isAnchorStep(step) {
  return Boolean(
    step && (step.type === 'HARD_ANCHOR' || typeof step.anchorId === 'string'),
  );
}

// A hard anchor cannot be swapped in either direction. Photographer cues are a
// warning (handled by the UI confirm), not a hard block.
export function swapBlockReason(currentStep, nextStep) {
  if (!currentStep) return 'No active step';
  if (!nextStep) return 'No next step to swap';
  if (isAnchorStep(currentStep)) return 'A hard-anchor step cannot be swapped';
  if (isAnchorStep(nextStep)) return 'The next step is a hard anchor and cannot move';
  return null;
}

export function swapNeedsWarning(currentStep, nextStep) {
  return stepHasPhotographerCue(currentStep) || stepHasPhotographerCue(nextStep);
}
