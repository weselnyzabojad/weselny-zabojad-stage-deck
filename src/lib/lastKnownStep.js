// Last-known live step snapshot (project.md TODO 24).
//
// The live state already persists on this device. This small snapshot gives the
// error boundary a human-readable "you were here" card without parsing the
// whole cartridge. Only display metadata is stored: no notes or scripts.

export const LAST_KNOWN_STEP_PREFIX = 'wzsd:v1:';
const LAST_KNOWN_STEP_SUFFIX = ':last_known_step';

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function lastKnownStepStorageKey(weddingId) {
  return `${LAST_KNOWN_STEP_PREFIX}${weddingId}${LAST_KNOWN_STEP_SUFFIX}`;
}

export function deriveLastKnownStep({
  weddingId = null,
  steps = [],
  activeStepId = null,
  completedStepIds = [],
  role = null,
} = {}) {
  const list = Array.isArray(steps) ? steps : [];
  const completed = Array.isArray(completedStepIds) ? completedStepIds : [];
  const step =
    list.find((candidate) => candidate.id === activeStepId) ??
    [...list].reverse().find((candidate) => completed.includes(candidate.id)) ??
    null;

  return {
    weddingId,
    stepId: step?.id ?? null,
    title: step?.title ?? null,
    type: step?.type ?? null,
    location: step?.location ?? null,
    plannedTime: step?.time ?? step?.planned ?? null,
    role: role ?? null,
    completedCount: completed.length,
    totalSteps: list.length,
    savedAt: null,
  };
}

export function saveLastKnownStep(
  { weddingId, step = null, role = null, completedCount = 0, totalSteps = 0 } = {},
  storage,
) {
  const store = getStorage(storage);
  if (!store || !weddingId) return null;

  // Keep the cross-wedding "latest snapshot" scan deterministic even when two
  // snapshots land in the same millisecond.
  const previousLatest = loadLatestLastKnownStep(store);
  const previousMs = Date.parse(previousLatest?.savedAt ?? '');
  const savedAt = new Date(
    Math.max(Date.now(), Number.isFinite(previousMs) ? previousMs + 1 : 0),
  ).toISOString();

  const snapshot = {
    weddingId,
    stepId: step?.id ?? null,
    title: step?.title ?? null,
    type: step?.type ?? null,
    location: step?.location ?? null,
    plannedTime: step?.time ?? step?.planned ?? null,
    role: role ?? null,
    completedCount: Number.isFinite(completedCount) ? completedCount : 0,
    totalSteps: Number.isFinite(totalSteps) ? totalSteps : 0,
    savedAt,
  };

  try {
    store.setItem(lastKnownStepStorageKey(weddingId), JSON.stringify(snapshot));
    return snapshot;
  } catch {
    return snapshot;
  }
}

export function loadLastKnownStep(weddingId, storage) {
  const store = getStorage(storage);
  if (!store || !weddingId) return null;

  try {
    const raw = store.getItem(lastKnownStepStorageKey(weddingId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

// The top-level boundary does not know the wedding id. Scan the bounded set of
// snapshots and return the newest one so a crash still names the current step.
export function loadLatestLastKnownStep(storage) {
  const store = getStorage(storage);
  if (!store) return null;

  try {
    const candidates = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (!key?.startsWith(LAST_KNOWN_STEP_PREFIX) || !key.endsWith(LAST_KNOWN_STEP_SUFFIX)) {
        continue;
      }
      const parsed = JSON.parse(store.getItem(key) ?? 'null');
      if (parsed && typeof parsed === 'object') candidates.push(parsed);
    }

    candidates.sort(
      (a, b) => new Date(b.savedAt ?? 0).getTime() - new Date(a.savedAt ?? 0).getTime(),
    );
    return candidates[0] ?? null;
  } catch {
    return null;
  }
}

export function clearLastKnownStep(weddingId, storage) {
  const store = getStorage(storage);
  if (!store || !weddingId) return false;

  try {
    store.removeItem(lastKnownStepStorageKey(weddingId));
    return true;
  } catch {
    return false;
  }
}
