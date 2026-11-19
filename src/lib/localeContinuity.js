// Locale continuity for public entry points (issue #1272).
//
// The main site can send `?lang=fr|pl|en` to the landing, the WordPress banner
// iframe and `/embed/*` routes. The URL parameter wins over the stored device
// locale; the stored locale wins over the per-route fallback. Deck, admin and
// other routes never call this helper, so they keep their existing behaviour.

import { normalizeLocale } from '../i18n/index.js';

export function parseLocaleParam(search = '') {
  if (typeof search !== 'string' || !search) return null;
  try {
    return normalizeLocale(new URLSearchParams(search).get('lang'));
  } catch {
    return null;
  }
}

export function resolveEntryLocale({ search = '', stored = null, fallback = 'pl' } = {}) {
  return (
    parseLocaleParam(search) ??
    normalizeLocale(stored) ??
    normalizeLocale(fallback) ??
    'pl'
  );
}
