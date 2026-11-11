import { normalizeRole } from './roles.js';

// Local view-role overrides. A view override changes only what this device
// renders; it never changes the authenticated role, token, PIN or synced state.
export const DEV_VIEW_ROLES = ['mc', 'dj', 'dj_standard', 'dj_mark', 'dj_szymoniak', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker', 'song_request'];

export function resolveBaseRole({ isProduction, roleSessionRole, role, availableRoles = [] }) {
  const candidate = normalizeRole(isProduction ? roleSessionRole : role);
  return availableRoles.includes(candidate) ? candidate : 'mc';
}

export function resolveAllowedViewRoles({
  isProduction,
  baseRole,
  availableRoles = [],
  development = false,
}) {
  if (development) return [...DEV_VIEW_ROLES];
  if (isProduction && baseRole === 'mc' && availableRoles.includes('dj')) {
    return ['mc', 'dj'];
  }
  return [baseRole];
}

export function resolveViewRole({ override, allowedRoles = [], baseRole }) {
  return override && allowedRoles.includes(override) ? override : baseRole;
}
