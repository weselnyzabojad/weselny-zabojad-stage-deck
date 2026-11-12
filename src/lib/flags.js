// Self-hosted 4:3 SVG flags from the `flag-icons` package (Phase 1.5c).
//
// Vite bundles the assets so the header renders offline and never contacts a
// third-party CDN. Flag images are decorative: the adjacent couple names and
// the screen-reader country list carry the meaning.

import { normalizeCountryCode } from './coupleIdentity.js';

const flagModules = import.meta.glob('../../node_modules/flag-icons/flags/4x3/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

const FLAG_URLS = Object.create(null);
for (const [path, url] of Object.entries(flagModules)) {
  const match = /\/([a-z]{2})\.svg$/.exec(path);
  if (match) FLAG_URLS[match[1].toUpperCase()] = url;
}

export function flagUrl(code) {
  const normalized = normalizeCountryCode(code);
  return normalized ? FLAG_URLS[normalized] ?? null : null;
}

export default FLAG_URLS;
