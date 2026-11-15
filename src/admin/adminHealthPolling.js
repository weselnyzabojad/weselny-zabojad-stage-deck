// Visibility-aware polling for the admin monitoring bar (issue #1013).
// Pure enough to test with a fake document/timer.

export const HEALTH_POLL_INTERVAL_MS = 60_000;

export function startHealthPolling({
  run,
  intervalMs = HEALTH_POLL_INTERVAL_MS,
  doc = typeof document === 'undefined' ? null : document,
  setIntervalImpl = setInterval,
  clearIntervalImpl = clearInterval,
} = {}) {
  let inFlight = false;

  async function safeRun() {
    if (inFlight) return false;
    if (doc && doc.visibilityState && doc.visibilityState !== 'visible') return false;
    inFlight = true;
    try {
      await run();
      return true;
    } finally {
      inFlight = false;
    }
  }

  function onVisibilityChange() {
    if (!doc || doc.visibilityState === 'visible') void safeRun();
  }

  if (doc?.addEventListener) doc.addEventListener('visibilitychange', onVisibilityChange);
  const timer = setIntervalImpl(() => {
    void safeRun();
  }, intervalMs);

  return {
    run: safeRun,
    stop() {
      clearIntervalImpl(timer);
      if (doc?.removeEventListener) doc.removeEventListener('visibilitychange', onVisibilityChange);
    },
  };
}
