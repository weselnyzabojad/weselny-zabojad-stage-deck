// Persistence + transitions for the on-stage step machine.
//
// The persisted shape mirrors `live_sync_state` from `WeddingSchema v1.1`, so
// the same payload can later be pushed to a cloud sync channel untouched and
// still work as the offline fallback when the venue loses reception.

import { normalizeStagePing } from './stagePings.js';
import { normalizeActualTimestamp } from './eventTime.js';
import { isProtectedStep, swapBlockReason } from './stepGuards.js';

const STORAGE_VERSION = 1;
const MAX_MANUAL_OFFSET_MINUTES = 12 * 60;

export function storageKey(weddingId) {
  return `wzsd:v${STORAGE_VERSION}:${weddingId}:live_sync_state`;
}

export function formatClock(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function addMinutesToClock(clock, minutes) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock ?? '');
  if (!match || !Number.isFinite(minutes)) return null;
  const rawTotal = Number(match[1]) * 60 + Number(match[2]) + minutes;
  const total = ((rawTotal % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function normalizeStepOrder(rawOrder, steps = []) {
  const validIds = steps.map((step) => step.id);
  const seen = new Set();
  const order = [];

  if (Array.isArray(rawOrder)) {
    for (const id of rawOrder) {
      if (typeof id === 'string' && validIds.includes(id) && !seen.has(id)) {
        seen.add(id);
        order.push(id);
      }
    }
  }

  for (const id of validIds) {
    if (!seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }

  return order;
}

export function orderedSteps(steps = [], state = {}) {
  const byId = new Map(steps.map((step) => [step.id, step]));
  return normalizeStepOrder(state?.step_order, steps)
    .map((id) => byId.get(id))
    .filter(Boolean);
}

// Deferred blocks stay in `step_order` so they can be restored later, but they
// are removed from the active on-stage sequence.
export function activeSteps(steps = [], state = {}) {
  const deferred = new Set(state?.deferred_step_ids ?? []);
  return orderedSteps(steps, state).filter((step) => !deferred.has(step.id));
}

export function findDeferTarget(steps = [], state = {}) {
  const ordered = activeSteps(steps, state);
  const completed = new Set(state?.completed_step_ids ?? []);
  const activeIndex = ordered.findIndex((step) => step.id === state?.active_step_id);
  const candidates = activeIndex >= 0 ? ordered.slice(activeIndex + 1) : ordered;
  return (
    candidates.find(
      (step) =>
        step?.deferable === true &&
        !completed.has(step.id) &&
        // Never silently defer a hard anchor or a photographer-cue step (P0.7).
        !isProtectedStep(step),
    ) ?? null
  );
}

// Union two append-only logs by entry id so adopting remote state never drops
// entries written on this device.
export function mergeMutationLogs(left = [], right = []) {
  const seen = new Set();
  const merged = [];
  for (const entry of [...left, ...right]) {
    if (!entry || typeof entry !== 'object') continue;
    const id =
      typeof entry.id === 'string' ? entry.id : `${entry.op ?? 'mutation'}_${entry.timestamp ?? ''}`;
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(entry);
  }
  return merged;
}

// Append-only audit entry (`device_id`, `role`, `op`, `timestamp`, payload).
export function appendMutation(state, actor = {}, op, payload = null, now = new Date()) {
  const timestamp =
    now instanceof Date && Number.isFinite(now.getTime()) ? now.toISOString() : new Date().toISOString();
  const entry = {
    id: `${op}_${timestamp}_${(state.mutation_log?.length ?? 0) + 1}`,
    device_id: typeof actor?.deviceId === 'string' ? actor.deviceId : 'unknown',
    role: typeof actor?.role === 'string' ? actor.role : 'mc',
    op,
    timestamp,
    payload: payload ?? null,
  };
  return { ...state, mutation_log: [...(state.mutation_log ?? []), entry] };
}

// Undo one snapshot while keeping the append-only audit log intact.
export function undoSnapshot(
  current,
  snapshot,
  { actor = {}, now = new Date(), targetOp = null } = {},
) {
  if (!snapshot || typeof snapshot !== 'object') return current;

  const restored = {
    ...current,
    active_step_id: snapshot.active_step_id ?? null,
    completed_step_ids: [...(snapshot.completed_step_ids ?? [])],
    actual_timestamps: { ...(snapshot.actual_timestamps ?? {}) },
    checked_subtasks: { ...(snapshot.checked_subtasks ?? {}) },
    step_order: [...(snapshot.step_order ?? current.step_order ?? [])],
    deferred_step_ids: [...(snapshot.deferred_step_ids ?? [])],
    manual_offset_minutes: Number.isFinite(snapshot.manual_offset_minutes)
      ? snapshot.manual_offset_minutes
      : 0,
    active_speech_id: snapshot.active_speech_id ?? null,
  };

  return appendMutation(restored, actor, 'undo', { targetOp }, now);
}

export function createLiveState(steps, overrides = {}) {
  return {
    active_step_id: steps[0]?.id ?? null,
    completed_step_ids: [],
    actual_timestamps: {},
    checked_subtasks: {},
    stage_ping: null,
    step_order: steps.map((step) => step.id),
    deferred_step_ids: [],
    manual_offset_minutes: 0,
    active_speech_id: null,
    mutation_log: [],
    ...overrides,
  };
}

export function normalizeLiveState(raw, steps, context = {}) {
  const order = normalizeStepOrder(raw?.step_order, steps);
  if (!raw || typeof raw !== 'object' || order.length === 0) {
    return createLiveState(steps);
  }

  const rawCompleted = Array.isArray(raw.completed_step_ids) ? raw.completed_step_ids : [];
  const completed = order.filter((id) => rawCompleted.includes(id));

  const rawDeferred = Array.isArray(raw.deferred_step_ids) ? raw.deferred_step_ids : [];
  const deferred = order.filter(
    (id) => rawDeferred.includes(id) && !completed.includes(id),
  );

  let active = order.includes(raw.active_step_id) ? raw.active_step_id : null;
  if (active && (completed.includes(active) || deferred.includes(active))) active = null;

  const eventFinished = raw.active_step_id === null && completed.length === order.length;
  if (!active && !eventFinished) {
    active = order.find((id) => !completed.includes(id) && !deferred.includes(id)) ?? null;
  }

  const actual = {};
  if (raw.actual_timestamps && typeof raw.actual_timestamps === 'object') {
    for (const id of order) {
      const value = normalizeActualTimestamp(raw.actual_timestamps[id], context);
      if (value) actual[id] = value;
    }
  }

  const checked = {};
  if (raw.checked_subtasks && typeof raw.checked_subtasks === 'object') {
    for (const [task, value] of Object.entries(raw.checked_subtasks)) {
      if (typeof value === 'boolean') checked[task] = value;
    }
  }

  const rawOffset = raw.manual_offset_minutes;
  const manualOffset = Number.isFinite(rawOffset)
    ? Math.max(0, Math.min(MAX_MANUAL_OFFSET_MINUTES, Math.round(rawOffset)))
    : 0;

  const activeSpeech =
    typeof raw.active_speech_id === 'string' && raw.active_speech_id.trim()
      ? raw.active_speech_id.trim()
      : null;

  const rawLog = Array.isArray(raw.mutation_log) ? raw.mutation_log : [];
  const mutationLog = rawLog
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry, index) => ({
      id: typeof entry.id === 'string' ? entry.id : `mutation_${index + 1}`,
      device_id:
        typeof entry.device_id === 'string'
          ? entry.device_id
          : typeof entry.deviceId === 'string'
            ? entry.deviceId
            : 'unknown',
      role: typeof entry.role === 'string' ? entry.role : 'mc',
      op: typeof entry.op === 'string' ? entry.op : 'unknown',
      timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : '',
      payload: entry.payload ?? null,
    }));

  return {
    active_step_id: active ?? null,
    completed_step_ids: completed,
    actual_timestamps: actual,
    checked_subtasks: checked,
    stage_ping: normalizeStagePing(raw.stage_ping),
    step_order: order,
    deferred_step_ids: deferred,
    manual_offset_minutes: manualOffset,
    active_speech_id: activeSpeech,
    mutation_log: mutationLog,
  };
}

export function markStepDone(state, steps, now = new Date(), actor = {}) {
  const ordered = activeSteps(steps, state);
  const index = ordered.findIndex((step) => step.id === state.active_step_id);
  if (index === -1) return state;

  const currentId = ordered[index].id;
  const completed = state.completed_step_ids.includes(currentId)
    ? state.completed_step_ids
    : [...state.completed_step_ids, currentId];

  const nextStep = ordered.slice(index + 1).find((step) => !completed.includes(step.id)) ?? null;
  const actual = { ...state.actual_timestamps };
  if (nextStep && !actual[nextStep.id]) {
    actual[nextStep.id] = now.toISOString();
  }

  const next = {
    ...state,
    active_step_id: nextStep ? nextStep.id : null,
    completed_step_ids: completed,
    actual_timestamps: actual,
  };

  return appendMutation(
    next,
    actor,
    'complete_step',
    { stepId: currentId, nextStepId: nextStep?.id ?? null },
    now,
  );
}

export function undoStep(state) {
  if (state.completed_step_ids.length === 0) return state;

  const completed = [...state.completed_step_ids];
  const restoredId = completed.pop();
  const actual = { ...state.actual_timestamps };
  if (state.active_step_id) delete actual[state.active_step_id];

  return {
    ...state,
    active_step_id: restoredId,
    completed_step_ids: completed,
    actual_timestamps: actual,
    deferred_step_ids: (state.deferred_step_ids ?? []).filter((id) => id !== restoredId),
  };
}

export function toggleSubtask(state, task, actor = {}) {
  if (typeof task !== 'string' || task.length === 0) return state;
  const checked = !state.checked_subtasks[task];
  const next = {
    ...state,
    checked_subtasks: {
      ...state.checked_subtasks,
      [task]: checked,
    },
  };
  return appendMutation(next, actor, 'toggle_subtask', { task, checked });
}

export function addManualOffset(state, minutes, actor = {}) {
  const delta = Number(minutes);
  if (!Number.isFinite(delta) || delta === 0) return state;

  const current = Number.isFinite(state.manual_offset_minutes)
    ? state.manual_offset_minutes
    : 0;
  const nextValue = Math.max(
    0,
    Math.min(MAX_MANUAL_OFFSET_MINUTES, Math.round(current + delta)),
  );

  if (nextValue === current) return state;
  const next = { ...state, manual_offset_minutes: nextValue };
  return appendMutation(next, actor, 'offset', { from: current, to: nextValue, delta });
}

export function clearManualOffset(state, actor = {}) {
  if (!state.manual_offset_minutes) return state;
  const next = { ...state, manual_offset_minutes: 0 };
  return appendMutation(next, actor, 'clear_offset', { from: state.manual_offset_minutes });
}

// MC-only selection of the live speech; synced so the speaker device receives
// only the assigned script (see `resolveActiveSpeech`).
export function setActiveSpeech(state, speechId, actor = {}) {
  const nextValue = typeof speechId === 'string' && speechId.trim() ? speechId.trim() : null;
  if ((state.active_speech_id ?? null) === nextValue) return state;
  const next = { ...state, active_speech_id: nextValue };
  return appendMutation(next, actor, 'select_speech', {
    from: state.active_speech_id ?? null,
    to: nextValue,
  });
}

// Execute the next block first, then return to the current block. The old
// current block loses its start timestamp because it has been postponed; the
// swapped-in block is logged as starting now.
export function swapStepWithNext(state, steps, now = new Date(), actor = {}) {
  const ordered = activeSteps(steps, state);
  const index = ordered.findIndex((step) => step.id === state.active_step_id);
  if (index === -1) return state;

  const current = ordered[index];
  const next = ordered.slice(index + 1).find((step) => !state.completed_step_ids.includes(step.id));
  if (!next) return state;
  // P0.7: never swap a hard anchor (in either direction).
  if (swapBlockReason(current, next)) return state;

  const order = normalizeStepOrder(state.step_order, steps);
  const currentPos = order.indexOf(state.active_step_id);
  const nextPos = order.indexOf(next.id);
  if (currentPos === -1 || nextPos === -1) return state;

  [order[currentPos], order[nextPos]] = [order[nextPos], order[currentPos]];

  const actual = { ...state.actual_timestamps };
  delete actual[state.active_step_id];
  if (!actual[next.id]) actual[next.id] = now.toISOString();

  const nextState = {
    ...state,
    step_order: order,
    active_step_id: next.id,
    actual_timestamps: actual,
  };
  return appendMutation(
    nextState,
    actor,
    'swap',
    { stepId: current.id, nextStepId: next.id },
    now,
  );
}

export function deferStepToJoker(state, steps, now = new Date(), actor = {}) {
  const target = findDeferTarget(steps, state);
  if (!target) return state;

  const ordered = activeSteps(steps, state);
  const targetIndex = ordered.findIndex((step) => step.id === target.id);
  const wasActive = state.active_step_id === target.id;

  const actual = { ...state.actual_timestamps };
  delete actual[target.id];

  let active = state.active_step_id;
  if (wasActive) {
    const next = ordered.slice(targetIndex + 1).find((step) => !state.completed_step_ids.includes(step.id)) ?? null;
    active = next?.id ?? null;
    if (next && !actual[next.id]) actual[next.id] = now.toISOString();
  }

  const deferred = state.deferred_step_ids ?? [];
  const nextState = {
    ...state,
    active_step_id: active,
    deferred_step_ids: deferred.includes(target.id) ? deferred : [...deferred, target.id],
    actual_timestamps: actual,
  };
  return appendMutation(
    nextState,
    actor,
    'defer',
    { stepId: target.id, wasActive },
    now,
  );
}

export function restoreDeferredStep(state, stepId, steps = [], actor = {}) {
  const deferred = state.deferred_step_ids ?? [];
  if (!deferred.includes(stepId)) return state;

  const nextDeferred = deferred.filter((id) => id !== stepId);
  let stepOrder = state.step_order;

  // Re-insert the restored block immediately after the active block so it is
  // launchable now, rather than appearing before the current step.
  if (steps.length > 0) {
    const without = normalizeStepOrder(state.step_order, steps).filter((id) => id !== stepId);
    const activeIndex = without.indexOf(state.active_step_id);
    stepOrder = [...without];
    stepOrder.splice(activeIndex >= 0 ? activeIndex + 1 : without.length, 0, stepId);
  }

  const nextActive =
    state.active_step_id ?? (state.completed_step_ids.includes(stepId) ? null : stepId);

  const nextState = {
    ...state,
    active_step_id: nextActive,
    step_order: stepOrder,
    deferred_step_ids: nextDeferred,
  };
  return appendMutation(nextState, actor, 'restore', { stepId });
}

export function loadLiveState(key, steps, context = {}) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return normalizeLiveState(JSON.parse(raw), steps, context);
  } catch {
    // Corrupt JSON or blocked storage: fall back to the cartridge defaults.
    return null;
  }
}

export function saveLiveState(key, state) {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    // Private mode / quota exceeded: keep running in memory.
    return false;
  }
}
