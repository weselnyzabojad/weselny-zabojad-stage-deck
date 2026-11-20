// Wedding Monitor PWA route helpers (issue #1288).
//
// `/status` is an owner-authenticated monitoring surface that installs from its
// own manifest and service worker. The deck PWA keeps `/`, `/admin` and the
// other routes unchanged.

export const STATUS_PATH = '/status';
export const STATUS_MANIFEST_PATH = '/status/manifest.webmanifest';
export const STATUS_SW_PATH = '/status/sw.js';
export const STATUS_SCOPE = '/status';
export const STATUS_START_URL = '/status?pwa=1';

export function isStatusPath(pathname = '') {
  const normalized = String(pathname).replace(/\/+$/, '') || '/';
  return normalized === STATUS_PATH;
}

// Standalone launches are detected from the display mode, the iOS
// `navigator.standalone` flag, or the explicit `?pwa=1` start URL.
export function isMonitorStandalone({
  matchMedia,
  navigator,
  search = '',
} = {}) {
  if (typeof matchMedia === 'function') {
    try {
      if (matchMedia('(display-mode: standalone)').matches) return true;
    } catch {
      // A partial matchMedia stub in tests must not break the route.
    }
  }
  if (navigator?.standalone === true) return true;
  return new URLSearchParams(String(search)).get('pwa') === '1';
}
