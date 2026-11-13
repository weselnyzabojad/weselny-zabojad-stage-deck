// Applies the saved per-device theme (TODO 27) before the first paint.
//
// This is a plain same-origin script in `public/`, loaded synchronously from
// `index.html`. Keeping it out of the bundle means:
// - the Netlify CSP can stay `script-src 'self'` (no inline script, no hash);
// - the theme is applied before React mounts and before the first paint,
//   regardless of how the app bundle is chunked.
//
// Explicit toggle wins over prefers-color-scheme. Failures fall back to night.
(function () {
  'use strict';

  try {
    var raw = localStorage.getItem('wzsd:v1:theme');
    var stored = raw ? JSON.parse(raw) : null;
    var theme =
      stored && (stored.theme === 'day' || stored.theme === 'night')
        ? stored.theme
        : null;
    if (!theme) {
      theme =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'day'
          : 'night';
    }
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === 'day' ? 'light' : 'dark';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'day' ? '#eef2f7' : '#070b19');
  } catch {
    document.documentElement.dataset.theme = 'night';
  }
})();
