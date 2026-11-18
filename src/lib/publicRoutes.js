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

// Private recap links are `/recap/<token>` (or `/deck/recap/<token>` when the
// app is hosted under a base path). The token is opaque; validation is done by
// the Edge Function.
export function parseRecapToken(pathname = '', baseUrl = '/') {
  let rest = pathname || '';
  if (baseUrl && baseUrl !== '/' && rest.startsWith(baseUrl)) {
    rest = rest.slice(baseUrl.length);
    if (!rest.startsWith('/')) rest = `/${rest}`;
  }
  const match = /^\/recap\/([A-Za-z0-9_-]{32,128})\/?$/.exec(rest);
  return match ? match[1] : null;
}

// Public season stats iframe (issue #1217). The default is Polish and the
// parameters are per-request only; they must never persist to storage.
export const EMBED_LANGUAGES = Object.freeze(['pl', 'fr', 'en']);

export function parseSeasonStatsEmbed(pathname = '', search = '', baseUrl = '/') {
  let rest = pathname || '';
  if (baseUrl && baseUrl !== '/' && rest.startsWith(baseUrl)) {
    rest = rest.slice(baseUrl.length);
    if (!rest.startsWith('/')) rest = `/${rest}`;
  }
  if (!/^\/embed\/season-stats\/?$/.test(rest)) return null;
  const params = new URLSearchParams(search || '');
  const requested = (params.get('lang') || '').toLowerCase();
  return {
    lang: EMBED_LANGUAGES.includes(requested) ? requested : 'pl',
    theme: params.get('theme') === 'transparent' ? 'transparent' : 'dark',
  };
}
