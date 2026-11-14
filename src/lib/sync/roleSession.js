// Role-scoped session for production `/deck/` (P0.2 / role PINs).
//
// The join_room Edge Function returns a short-lived JWT bound to one wedding and
// one device role. It is cached locally so the device can keep working offline
// until the token expires; it is never put in the cartridge or the QR codes.

import { ROLES } from '../roles.js';

const STORAGE_VERSION = 1;
export const ROLE_SESSION_STORAGE_KEY = `wzsd:v${STORAGE_VERSION}:role-session`;

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function normalizeRole(value) {
  return typeof value === 'string' && ROLES[value] ? value : null;
}

// Deep-link roles keep the canonical catalog but tolerate the legacy `photo`
// alias; unknown values stay null instead of falling back to MC (issue #877).
function parseIntentRole(value) {
  if (value === 'photo') return 'photo1';
  return normalizeRole(value);
}

function normalizeExpiry(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function normalizeRoleSession(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const token = typeof raw.token === 'string' && raw.token.trim() ? raw.token.trim() : null;
  const weddingId = typeof raw.weddingId === 'string' && raw.weddingId.trim() ? raw.weddingId.trim() : null;
  const role = normalizeRole(raw.role);
  const expiresAt = normalizeExpiry(raw.expiresAt);
  const roomId =
    typeof raw.roomId === 'string' && raw.roomId.trim()
      ? raw.roomId.trim()
      : weddingId
        ? `wzsd:${weddingId}`
        : null;

  if (!token || !weddingId || !role || !roomId || !expiresAt) return null;

  return { token, weddingId, role, roomId, expiresAt };
}

export function isRoleSessionValid(session, now = Date.now()) {
  const normalized = normalizeRoleSession(session);
  return Boolean(normalized && normalized.expiresAt > now);
}

export function saveRoleSession(session, storage) {
  const store = getStorage(storage);
  const normalized = normalizeRoleSession(session);
  if (!store || !normalized) return false;

  try {
    store.setItem(ROLE_SESSION_STORAGE_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

export function loadRoleSession(storage, now = Date.now()) {
  const store = getStorage(storage);
  if (!store) return null;

  try {
    const raw = store.getItem(ROLE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = normalizeRoleSession(JSON.parse(raw));
    if (!session || session.expiresAt <= now) return null;
    return session;
  } catch {
    return null;
  }
}

export function clearRoleSession(storage) {
  const store = getStorage(storage);
  if (!store) return false;
  try {
    store.removeItem(ROLE_SESSION_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

// `https://host/deck/8f3k2q/dj` (or `/deck/?room=8f3k2q&role=dj`) preselects a
// room and role. The PIN is still required.
export function parseDeckIntent(pathname = '', search = '', baseUrl = '/') {
  const params = new URLSearchParams(search);
  let rest = pathname || '';

  if (baseUrl && baseUrl !== '/' && rest.startsWith(baseUrl)) {
    rest = rest.slice(baseUrl.length);
  }
  const segments = rest.split('/').filter(Boolean);
  // `/join` is the crew entry, not a room code. Query-based intent still works
  // (`/join?room=…&role=…`), and role QR links stay `/<room>/<role>`.
  const joinRoute = segments[0] === 'join';

  const roomCode =
    (params.get('room') || (joinRoute ? '' : segments[0]) || '').trim() || null;
  const role = parseIntentRole(
    (params.get('role') || (joinRoute ? '' : segments[1]) || '').trim(),
  );
  const requirePin = params.get('phone') === 'true';

  return { roomCode, role, requirePin };
}

export { DEFAULT_TTL_MS };
