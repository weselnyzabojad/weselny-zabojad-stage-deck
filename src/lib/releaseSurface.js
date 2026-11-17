/**
 * Release surface switch (issue #1152).
 *
 * `RELEASE_SURFACE` selects which HTML entry the production build emits:
 * - unset / empty / `full` — the current full deck (deck, admin, recap, requests).
 * - `landing` — the public marketing landing plus a branded 404, no deck.
 *
 * Parsing lives in its own module so the Vite config, the build plugin and the
 * tests share one contract and an invalid value fails the build with one clear
 * message instead of silently falling back to a full release.
 */
export const RELEASE_SURFACES = Object.freeze(['full', 'landing']);

export function parseReleaseSurface(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return 'full';
  if (RELEASE_SURFACES.includes(normalized)) return normalized;
  throw new Error(
    `Invalid RELEASE_SURFACE="${value}". Use "full" (default) or "landing".`,
  );
}

export function isLandingSurface(surface) {
  return surface === 'landing';
}
