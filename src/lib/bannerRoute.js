// Landing iframe route and language detection (issue #1239).
//
// Kept free of deck, admin, recap and request imports so the landing-only
// release entry (`src/landing-main.jsx`) can use it without pulling deck chunks.

export const BANNER_PATH = '/extra/banner';
export const BANNER_FALLBACK_LOCALE = 'fr';

export function isBannerPath(pathname = '', baseUrl = '/') {
  let rest = pathname || '';
  if (baseUrl && baseUrl !== '/' && rest.startsWith(baseUrl)) {
    rest = rest.slice(baseUrl.length);
    if (!rest.startsWith('/')) rest = `/${rest}`;
  }
  return new RegExp(`^${BANNER_PATH}/?$`).test(rest);
}

// Accepts `navigator.languages` or a single language tag; unsupported browsers
// fall back to French.
export function detectBannerLocale(languages = []) {
  const list = Array.isArray(languages) ? languages : [languages];
  for (const value of list) {
    const base = typeof value === 'string'
      ? value.trim().toLowerCase().replaceAll('_', '-').split('-')[0]
      : '';
    if (base === 'fr' || base === 'pl' || base === 'en') return base;
  }
  return BANNER_FALLBACK_LOCALE;
}
