// Persistence + transitions for the on-stage step machine.
//
// The persisted shape mirrors `live_sync_state` from `WeddingSchema v1.1`, so
// the same payload can later be pushed to a cloud sync channel untouched and
// still work as the offline fallback when the venue loses reception.

import { normalizeStagePing } from './stagePings.js';

const STORAGE_VERSION = 1;

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

export function createLiveState(steps, overrides = {}) {
  return {
    active_step_id: steps[0]?.id ?? null,
    completed_step_ids: [],
    actual_timestamps: {},
    checked_subtasks: {},
    stage_ping: null,
    ...overrides,
  };
}

export function normalizeLiveState(raw, steps) {
  const ids = steps.map((step) => step.id);
  if (!raw || typeof raw !== 'object' || ids.length === 0) {
    return createLiveState(steps);
  }

  const rawCompleted = Array.isArray(raw.completed_step_ids) ? raw.completed_step_ids : [];
  const completed = ids.filter((id) => rawCompleted.includes(id));

  let active = ids.includes(raw.active_step_id) ? raw.active_step_id : null;
  if (active && completed.includes(active)) active = null;

  const eventFinished = raw.active_step_id === null && completed.length === ids.length;
  if (!active && !eventFinished) {
    active = ids.find((id) => !completed.includes(id)) ?? null;
  }

  const actual = {};
  if (raw.actual_timestamps && typeof raw.actual_timestamps === 'object') {
    for (const id of ids) {
      if (typeof raw.actual_timestamps[id] === 'string') actual[id] = raw.actual_timestamps[id];
    }
  }

  const checked = {};
  if (raw.checked_subtasks && typeof raw.checked_subtasks === 'object') {
    for (const [task, value] of Object.entries(raw.checked_subtasks)) {
      if (typeof value === 'boolean') checked[task] = value;
    }
  }

  return {
    active_step_id: active ?? null,
    completed_step_ids: completed,
    actual_timestamps: actual,
    checked_subtasks: checked,
    stage_ping: normalizeStagePing(raw.stage_ping),
  };
}

export function markStepDone(state, steps, now = new Date()) {
  const index = steps.findIndex((step) => step.id === state.active_step_id);
  if (index === -1) return state;

  const currentId = steps[index].id;
  const completed = state.completed_step_ids.includes(currentId)
    ? state.completed_step_ids
    : [...state.completed_step_ids, currentId];

  const nextStep = steps.slice(index + 1).find((step) => !completed.includes(step.id)) ?? null;
  const actual = { ...state.actual_timestamps };
  if (nextStep && !actual[nextStep.id]) {
    actual[nextStep.id] = formatClock(now);
  }

  return {
    ...state,
    active_step_id: nextStep ? nextStep.id : null,
    completed_step_ids: completed,
    actual_timestamps: actual,
  };
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
  };
}

export function toggleSubtask(state, task) {
  if (typeof task !== 'string' || task.length === 0) return state;
  return {
    ...state,
    checked_subtasks: {
      ...state.checked_subtasks,
      [task]: !state.checked_subtasks[task],
    },
  };
}

export function loadLiveState(key, steps) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return normalizeLiveState(JSON.parse(raw), steps);
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
