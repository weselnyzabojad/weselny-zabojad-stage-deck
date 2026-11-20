// Issue #81: App writes the current reload-safety context here; the global
// PWA update prompt reads it. Keeping this outside React lets the prompt render
// once in main.jsx while still following App state.

let context = { blockedReason: null, overlay: null };
const listeners = new Set();

function normalize(next = {}) {
  return {
    blockedReason:
      typeof next.blockedReason === 'string' && next.blockedReason.trim()
        ? next.blockedReason.trim()
        : null,
    overlay:
      typeof next.overlay === 'string' && next.overlay.trim() ? next.overlay.trim() : null,
  };
}

export function setPwaReloadContext(next) {
  const normalized = normalize(next);
  if (
    normalized.blockedReason === context.blockedReason &&
    normalized.overlay === context.overlay
  ) {
    return;
  }
  context = normalized;
  for (const listener of listeners) listener();
}

export function getPwaReloadContext() {
  return context;
}

export function subscribePwaReloadContext(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
