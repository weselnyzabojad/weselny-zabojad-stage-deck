// Issue #81: remember the live surface across an accepted PWA reload.
//
// Active step, actual timestamps and checked subtasks are already persisted by
// the live-state store. This module adds the pieces that only live in App state:
// the open overlay and the scroll position.

const STORAGE_KEY = 'wzsd:v1:reload-state';
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;

function defaultStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function validOverlay(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function saveReloadState({
  overlay = null,
  scrollY = 0,
  storage = null,
  now = Date.now(),
} = {}) {
  const store = storage ?? defaultStorage();
  if (!store) return false;

  const payload = {
    overlay: validOverlay(overlay),
    scrollY: Number.isFinite(scrollY) ? Math.max(0, scrollY) : 0,
    at: Number.isFinite(now) ? now : Date.now(),
  };

  try {
    store.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadReloadState({
  storage = null,
  now = Date.now(),
  maxAgeMs = DEFAULT_MAX_AGE_MS,
} = {}) {
  const store = storage ?? defaultStorage();
  if (!store) return null;

  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Number.isFinite(parsed.at) || Math.abs(now - parsed.at) > maxAgeMs) {
      store.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      overlay: validOverlay(parsed.overlay),
      scrollY: Number.isFinite(parsed.scrollY) ? Math.max(0, parsed.scrollY) : 0,
    };
  } catch {
    return null;
  }
}

export function clearReloadState({ storage = null } = {}) {
  const store = storage ?? defaultStorage();
  if (!store) return false;
  try {
    store.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export { STORAGE_KEY as RELOAD_STATE_STORAGE_KEY, DEFAULT_MAX_AGE_MS };
