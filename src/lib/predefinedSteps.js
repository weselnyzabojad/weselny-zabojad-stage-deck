// Media departures are planning data on mediaTeam.endTime, never timeline
// steps. Legacy cartridges may still carry PHOTO/CAMERA milestones; they are
// filtered here so every role, count and hard-anchor consumer sees the same
// timeline.
export function isMediaLeaveMilestone(step) {
  return (
    step?.mandatory?.kind === 'MILESTONE' &&
    (step.mandatory.milestoneKind === 'PHOTO' ||
      step.mandatory.milestoneKind === 'CAMERA')
  );
}

// Optional predefined steps are included only when their cartridge feature
// flag is enabled. Mandatory steps have no optionalFlag.
export function filterEnabledSteps(wedding) {
  const steps = Array.isArray(wedding?.steps) ? wedding.steps : [];
  return steps.filter((step) => {
    if (isMediaLeaveMilestone(step)) return false;
    // Wishes and game steps are enabled by their own presence; the game object
    // carries its own enabled flag for explicitly disabled games.
    if (step?.game) return step.game.enabled !== false;
    if (!step?.optionalFlag) return true;
    if (step.optionalFlag === 'oczepiny') return wedding?.oczepiny?.enabled === true;
    // A DJ set is a regular timeline block, not a feature-gated optional step.
    if (step.optionalFlag === 'dj_set') return true;
    if (step.optionalFlag === 'wishes' || step.optionalFlag === 'games') return true;
    return true;
  });
}
