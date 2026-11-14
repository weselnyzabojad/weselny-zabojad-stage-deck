import { normalizeRoomCode } from './songRequests.js';
import { JOINABLE_ROLE_IDS, normalizeRole } from './roles.js';

const ROLES = new Set(JOINABLE_ROLE_IDS);

export function canOpenOnPhone({ role, tier, compact = false } = {}) {
  const resolved = role === 'photo' ? 'photo1' : role;
  if (compact || !ROLES.has(resolved)) return false;
  if (resolved === 'dj') return String(tier).toUpperCase() === 'VIP';
  return true;
}

export function buildOpenOnPhoneUrl({
  origin = '',
  baseUrl = '/',
  roomCode = null,
  role = 'mc',
} = {}) {
  const base = `${origin}${baseUrl}`.replace(/\/+$/, '');
  const code = normalizeRoomCode(roomCode);
  const resolved = normalizeRole(role);
  const safeRole = ROLES.has(resolved) ? resolved : 'mc';
  if (code) return `${base}/${code}/${safeRole}?phone=true`;
  return `${base}/?role=${safeRole}&phone=true`;
}
