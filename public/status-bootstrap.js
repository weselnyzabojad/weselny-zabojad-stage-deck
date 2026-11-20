// Wedding Monitor document bootstrap (issue #1288).
//
// `/status` shares the SPA shell with the deck, so this same-origin script
// swaps in the monitor manifest and registers the scoped monitor worker. It is
// loaded with `defer`, keeping CSP at `script-src 'self'` with no inline code.

(function () {
  var path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path !== '/status') return;

  var link = document.querySelector('link[rel="manifest"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    document.head.appendChild(link);
  }
  link.setAttribute('href', '/status/manifest.webmanifest');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker
        .register('/status/sw.js', { scope: '/status' })
        .catch(function () {
          // Monitoring still works without the install cache.
        });
    });
  }
})();
