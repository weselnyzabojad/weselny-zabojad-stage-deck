// Development-only preview helpers. The preview is an opt-in (`?dev=1`) tool
// for inspecting every timeline step without touching the live show. Nothing in
// this module is reachable from a production build once the caller's
// `import.meta.env.DEV` gate is replaced.

export function isDevPreviewRequested(search) {
  if (typeof search !== 'string' || search.length === 0) return false;
  try {
    return new URLSearchParams(search).get('dev') === '1';
  } catch {
    return false;
  }
}

// Make `stepId` the active preview step. The selected step leaves the completed
// set so the current-step cards render it; every other field and status is
// preserved. Reordering and the completion of other steps are deliberately
// untouched.
export function previewStepState(state, stepId, steps = []) {
  if (!state || typeof stepId !== 'string' || stepId.length === 0) return state;
  if (steps.length > 0 && !steps.some((step) => step.id === stepId)) return state;

  const completed = Array.isArray(state.completed_step_ids)
    ? state.completed_step_ids
    : [];

  return {
    ...state,
    active_step_id: stepId,
    completed_step_ids: completed.filter((id) => id !== stepId),
  };
}

// Resolve the adjacent enabled step in the current order. `direction` is -1 for
// previous and 1 for next. There is no wrap-around: the first/last step returns
// null. A missing current step also returns null so callers can disable the
// control instead of guessing.
export function adjacentStepId(orderedSteps, currentStepId, direction) {
  if (!Array.isArray(orderedSteps) || orderedSteps.length === 0) return null;
  if (direction !== -1 && direction !== 1) return null;

  const index = orderedSteps.findIndex((step) => step.id === currentStepId);
  if (index === -1) return null;

  return orderedSteps[index + direction]?.id ?? null;
}

