import { normalizeRoomCode } from './songRequests.js';

const ROLES = new Set(['mc', 'dj', 'photo', 'speaker']);

export function canOpenOnPhone({ role, tier, compact = false } = {}) {
  if (compact || !ROLES.has(role)) return false;
  if (role === 'dj') return String(tier).toUpperCase() === 'VIP';
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
  const safeRole = ROLES.has(role) ? role : 'mc';
  if (code) return `${base}/${code}/${safeRole}?phone=true`;
  return `${base}/?role=${safeRole}&phone=true`;
}
