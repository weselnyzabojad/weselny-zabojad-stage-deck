// Admin session authorization for `admin_api` (issue #165).
//
// Kept free of Deno/Node-only imports so Vitest can exercise unauthorized
// writes with mocked users/claims.

export const MFA_REAUTH_WINDOW_SECONDS = 5 * 60;

export function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replaceAll('-', '+').replaceAll('_', '/');
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}

export function mfaFresh(claims, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!claims || claims.aal !== 'aal2') return false;
  const amr = Array.isArray(claims.amr) ? claims.amr : [];
  const latest = amr
    .filter((entry) => entry?.method === 'totp' && Number.isFinite(Number(entry?.timestamp)))
    .map((entry) => Number(entry.timestamp))
    .sort((a, b) => a - b)
    .at(-1);
  return Boolean(latest && nowSeconds - latest <= MFA_REAUTH_WINDOW_SECONDS);
}

// `user` is the Supabase Auth user returned by `auth.getUser(token)`.
// `allowlisted` is the matching `public.app_admins` row (or null).
export function authorizeAdminSession({ user, allowlisted, claims } = {}) {
  if (!user) return { ok: false, status: 401, error: 'Invalid admin session.' };
  if (!allowlisted) {
    return { ok: false, status: 403, error: 'Not an allowlisted owner account.' };
  }
  if (claims?.aal !== 'aal2') {
    return { ok: false, status: 403, error: 'TOTP MFA required.', requiresMfa: true };
  }
  return { ok: true };
}
