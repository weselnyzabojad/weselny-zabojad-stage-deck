// Local publish outbox (project.md TODO 25).
//
// Live state is a full snapshot, so the outbox does not need to replay every
// keystroke: the latest local snapshot already contains every stage mutation.
// We keep a small metadata record per room while a publish is failing, retry it
// with exponential backoff, and clear it only after the cloud confirms a write.
//
// The record lives in localStorage so a reload before the next successful write
// cannot silently lose the mutation.

export const OUTBOX_STORAGE_PREFIX = 'wzsd:v1:sync-outbox:';
export const OUTBOX_BASE_DELAY_MS = 2000;
export const OUTBOX_MAX_DELAY_MS = 60000;

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function outboxStorageKey(roomKey) {
  return `${OUTBOX_STORAGE_PREFIX}${roomKey}`;
}

export function outboxBackoffMs(attempts) {
  const count = Number.isFinite(attempts) ? Math.max(1, Math.floor(attempts)) : 1;
  return Math.min(OUTBOX_MAX_DELAY_MS, OUTBOX_BASE_DELAY_MS * 2 ** (count - 1));
}

export function outboxRetryDelayMs(entry, now = new Date()) {
  if (!entry?.nextAttemptAt) return 0;
  const next = Date.parse(entry.nextAttemptAt);
  if (!Number.isFinite(next)) return 0;
  const reference = now instanceof Date && Number.isFinite(now.getTime()) ? now.getTime() : Date.now();
  return Math.max(0, next - reference);
}

function iso(value) {
  return value instanceof Date && Number.isFinite(value.getTime())
    ? value.toISOString()
    : new Date().toISOString();
}

export function createOutboxEntry(roomKey, now = new Date()) {
  const at = iso(now);
  return {
    roomKey,
    queuedAt: at,
    attempts: 0,
    lastAttemptAt: null,
    nextAttemptAt: at,
    lastError: null,
  };
}

export function loadOutbox(roomKey, storage) {
  const store = getStorage(storage);
  if (!store || !roomKey) return null;

  try {
    const raw = store.getItem(outboxStorageKey(roomKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.roomKey !== roomKey) return null;

    return {
      roomKey,
      queuedAt: typeof parsed.queuedAt === 'string' ? parsed.queuedAt : new Date().toISOString(),
      attempts: Number.isFinite(parsed.attempts) ? Math.max(0, Math.floor(parsed.attempts)) : 0,
      lastAttemptAt: typeof parsed.lastAttemptAt === 'string' ? parsed.lastAttemptAt : null,
      nextAttemptAt: typeof parsed.nextAttemptAt === 'string' ? parsed.nextAttemptAt : null,
      lastError: typeof parsed.lastError === 'string' ? parsed.lastError : null,
    };
  } catch {
    return null;
  }
}

export function saveOutbox(entry, storage) {
  const store = getStorage(storage);
  if (!store || !entry?.roomKey) return false;

  try {
    store.setItem(outboxStorageKey(entry.roomKey), JSON.stringify(entry));
    return true;
  } catch {
    return false;
  }
}

export function clearOutbox(roomKey, storage) {
  const store = getStorage(storage);
  if (!store || !roomKey) return false;

  try {
    store.removeItem(outboxStorageKey(roomKey));
    return true;
  } catch {
    return false;
  }
}

// A publish attempt failed: keep the room queued and schedule the next try.
export function recordOutboxFailure(roomKey, error, now = new Date(), storage) {
  const existing = loadOutbox(roomKey, storage) ?? createOutboxEntry(roomKey, now);
  const attempts = (existing.attempts ?? 0) + 1;
  const at = iso(now);

  const next = {
    ...existing,
    attempts,
    lastAttemptAt: at,
    nextAttemptAt: new Date(Date.parse(at) + outboxBackoffMs(attempts)).toISOString(),
    lastError: String(error ?? 'Publish failed').slice(0, 300),
  };

  saveOutbox(next, storage);
  return next;
}

// The cloud confirmed a write, but local state moved again while it was in
// flight. Keep the room queued so the newer snapshot is retried immediately.
export function enqueueOutbox(roomKey, now = new Date(), storage) {
  const existing = loadOutbox(roomKey, storage) ?? createOutboxEntry(roomKey, now);
  const next = {
    ...existing,
    attempts: 0,
    lastError: null,
    nextAttemptAt: iso(now),
  };
  saveOutbox(next, storage);
  return next;
}

// Reconnect / Realtime-connected: ignore the remaining backoff and try now.
export function wakeOutbox(entry, now = new Date()) {
  if (!entry) return null;
  return {
    ...entry,
    nextAttemptAt: iso(now),
  };
}
