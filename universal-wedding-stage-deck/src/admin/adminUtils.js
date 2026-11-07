// Pure helpers for the owner admin panel (issue #76). Keeping these free of
// React/Supabase makes the session, presence and QR rules testable offline.

export const ADMIN_PATH = '/deck/admin';
export const ADMIN_IDLE_MS = 30 * 60 * 1000;
export const ADMIN_ABSOLUTE_MS = 8 * 60 * 60 * 1000;
export const ADMIN_WARNING_MS = 5 * 60 * 1000;
export const MFA_REAUTH_WINDOW_MS = 5 * 60 * 1000;

export const ROLE_IDS = ['mc', 'dj', 'photo', 'photo1', 'photo2', 'video', 'speaker'];

export function isAdminPath(pathname = '') {
  const normalized = String(pathname).replace(/\/+$/, '') || '/';
  return normalized === ADMIN_PATH;
}

export function createAdminSession(now = Date.now()) {
  return { startedAt: now, lastActivity: now };
}

export function touchAdminSession(session, now = Date.now()) {
  return { ...session, lastActivity: now };
}

export function getAdminSessionState({ session, now = Date.now() } = {}) {
  if (!session) return { expired: true, reason: 'signed-out', idleRemainingMs: 0, absoluteRemainingMs: 0 };
  const startedAt = Number(session.startedAt) || now;
  const lastActivity = Number(session.lastActivity) || startedAt;
  const absoluteRemainingMs = startedAt + ADMIN_ABSOLUTE_MS - now;
  const idleRemainingMs = lastActivity + ADMIN_IDLE_MS - now;

  if (absoluteRemainingMs <= 0) {
    return { expired: true, reason: 'absolute', idleRemainingMs: 0, absoluteRemainingMs: 0 };
  }
  if (idleRemainingMs <= 0) {
    return { expired: true, reason: 'idle', idleRemainingMs: 0, absoluteRemainingMs };
  }
  return { expired: false, reason: null, idleRemainingMs, absoluteRemainingMs };
}

export function shouldWarnAdminSession({ session, now = Date.now() } = {}) {
  const state = getAdminSessionState({ session, now });
  return !state.expired && state.idleRemainingMs <= ADMIN_WARNING_MS;
}

// Supabase `amr` entries are `{ method, timestamp }` with a Unix-seconds
// timestamp. Destructive actions require a TOTP re-auth inside the window.
export function hasFreshMfa(claims, nowMs = Date.now()) {
  if (!claims || claims.aal !== 'aal2') return false;
  const nowSeconds = Math.floor(nowMs / 1000);
  const entries = Array.isArray(claims.amr) ? claims.amr : [];
  const latest = entries
    .filter((entry) => entry?.method === 'totp' && Number.isFinite(Number(entry?.timestamp)))
    .map((entry) => Number(entry.timestamp))
    .sort((a, b) => a - b)
    .at(-1);
  return Boolean(latest && nowSeconds - latest <= MFA_REAUTH_WINDOW_MS / 1000);
}

export function presenceStatus({ lastSeen, tokenExpiresAt, now = Date.now() } = {}) {
  if (tokenExpiresAt && Date.parse(tokenExpiresAt) <= now) return 'offline';
  const seen = typeof lastSeen === 'string' ? Date.parse(lastSeen) : Number(lastSeen);
  if (!Number.isFinite(seen)) return 'offline';
  const age = now - seen;
  if (age <= 2 * 60 * 1000) return 'online';
  if (age <= 10 * 60 * 1000) return 'idle';
  return 'offline';
}

export function validateWeddingId(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}_[a-z0-9_]+$/.test(value.trim());
}

export function validateRoomCode(value) {
  return typeof value === 'string' && /^[a-z0-9]{6,12}$/.test(value.trim().toLowerCase());
}

export function validateRoles(value) {
  const roles = Array.isArray(value) ? value : [];
  return [...new Set(roles)].filter((role) => ROLE_IDS.includes(role));
}

export function buildRoleLink(baseUrl, roomCode, role) {
  const base = String(baseUrl ?? '').replace(/\/+$/, '');
  return `${base}/${String(roomCode ?? '').trim()}/${role}`;
}

// QR cards carry the deep link, role, room code and event identity. The PIN is
// intentionally never part of this payload.
export function buildQrCards({ baseUrl, roomCode, wedding = {}, roles = [], labels = {} }) {
  return validateRoles(roles).map((role) => ({
    role,
    label: labels[role] ?? role,
    url: buildRoleLink(baseUrl, roomCode, role),
    roomCode: roomCode ?? '',
    weddingId: wedding.weddingId ?? wedding.wedding_id ?? '',
    couple: wedding.couple ?? '',
    date: wedding.date ?? '',
    venue: wedding.venue ?? '',
  }));
}

export function filterWeddings(rows = [], { query = '', status = 'active', role = null } = {}) {
  const needle = String(query).trim().toLowerCase();
  return rows.filter((row) => {
    const archived = Boolean(row.archived_at ?? row.archived);
    if (status === 'active' && archived) return false;
    if (status === 'archived' && !archived) return false;
    if (role && !validateRoles(row.roles).includes(role)) return false;
    if (!needle) return true;
    return [row.wedding_id, row.weddingId, row.couple, row.room_code, row.roomCode]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle));
  });
}

export function formatAdminTime(value, locale = 'en') {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function summarizeWedding(row = {}) {
  return {
    weddingId: row.wedding_id ?? row.weddingId ?? '',
    roomCode: row.room_code ?? row.roomCode ?? '',
    couple: row.couple ?? '—',
    date: row.date ?? '—',
    roles: validateRoles(row.roles),
    archived: Boolean(row.archived_at),
    expiresAt: row.expires_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}
