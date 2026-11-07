// Reconcile the live stage state with a newly published cartridge (issue #167).
//
// A cartridge change must never reset progress or replay mutations. We keep the
// live state, adapt its ordering to the new step ids, preserve the active
// step/speech while they still exist, and fall back to the next valid step when
// either was removed. The caller surfaces `notices` to the user.

import { normalizeStepOrder } from './liveStageState.js';

function stepIdsOf(steps) {
  return (Array.isArray(steps) ? steps : [])
    .map((step) => step?.id)
    .filter((id) => typeof id === 'string' && id.length > 0);
}

function speechIdsOf(speeches) {
  return new Set(
    (Array.isArray(speeches) ? speeches : [])
      .map((speech) => speech?.id)
      .filter((id) => typeof id === 'string' && id.length > 0),
  );
}

export function reconcileLiveStateWithCartridge({ liveState, steps = [], speeches = [] } = {}) {
  if (!liveState || typeof liveState !== 'object') {
    return { state: liveState, changed: false, notices: [] };
  }

  const stepIds = stepIdsOf(steps);
  if (stepIds.length === 0) {
    return { state: liveState, changed: false, notices: [] };
  }

  const knownSteps = new Set(stepIds);
  const knownSpeeches = speechIdsOf(speeches);
  const order = normalizeStepOrder(liveState.step_order, steps);
  const completed = order.filter((id) => liveState.completed_step_ids?.includes(id));

  const previousActive = liveState.active_step_id ?? null;
  const previousActiveExists =
    typeof previousActive === 'string' && knownSteps.has(previousActive);
  const previousActiveCompleted =
    previousActiveExists && completed.includes(previousActive);

  const eventFinished =
    previousActive === null && order.length > 0 && completed.length === order.length;
  let active = previousActiveExists && !previousActiveCompleted ? previousActive : null;
  if (!active && !eventFinished) {
    active = order.find((id) => !completed.includes(id)) ?? null;
  }

  const previousSpeech = liveState.active_speech_id ?? null;
  const speechStillExists =
    typeof previousSpeech === 'string' && knownSpeeches.has(previousSpeech);
  const activeSpeech = speechStillExists ? previousSpeech : null;

  const actualTimestamps = {};
  if (liveState.actual_timestamps && typeof liveState.actual_timestamps === 'object') {
    for (const [id, value] of Object.entries(liveState.actual_timestamps)) {
      if (knownSteps.has(id)) actualTimestamps[id] = value;
    }
  }

  const stagePing =
    liveState.stage_ping?.step_id && !knownSteps.has(liveState.stage_ping.step_id)
      ? null
      : liveState.stage_ping ?? null;

  const next = {
    ...liveState,
    active_step_id: active ?? null,
    completed_step_ids: completed,
    actual_timestamps: actualTimestamps,
    stage_ping: stagePing,
    step_order: order,
    active_speech_id: activeSpeech,
  };

  const notices = [];
  if (typeof previousActive === 'string' && !knownSteps.has(previousActive)) {
    notices.push({
      kind: 'step_removed',
      id: previousActive,
      fallbackStepId: active ?? null,
    });
  }
  if (typeof previousSpeech === 'string' && !knownSpeeches.has(previousSpeech)) {
    notices.push({ kind: 'speech_removed', id: previousSpeech });
  }

  return {
    state: next,
    changed: JSON.stringify(next) !== JSON.stringify(liveState),
    notices,
  };
}
