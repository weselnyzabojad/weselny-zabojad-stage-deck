// Public route helpers (issue #805).
//
// The marketing landing owns the exact site root. Everything else keeps the
// existing behaviour: `/join` is the crew entry, `/<room>/<role>` opens the
// role intent, and `/admin` / `/request/:code` keep their own branches.

export const LANDING_PATHS = Object.freeze(['/', '/index.html']);

export function isLandingPath(pathname = '') {
  const normalized =
    pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return LANDING_PATHS.includes(normalized);
}
