// Main-site URL helper (issue #1271).
//
// The main site publishes only two localized pages today: PL at `/` and FR at
// `/fr/home-fr/`. There is no EN page (`/en/` returns 404), so EN and any
// unknown locale fall back to the PL root. Keep every outgoing main-site URL
// centralized here instead of hardcoding the origin in components.
import { normalizeLocale } from '../i18n/index.js';

export const MAIN_SITE_ORIGIN = 'https://www.weselnyzabojad.pl';

const MAIN_SITE_PATHS = Object.freeze({
  pl: '/',
  fr: '/fr/home-fr/',
  en: '/',
});

export function getMainSiteUrl(lang) {
  const locale = normalizeLocale(lang) ?? 'pl';
  return new URL(MAIN_SITE_PATHS[locale], MAIN_SITE_ORIGIN).toString();
}
