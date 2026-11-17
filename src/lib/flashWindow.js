// Silent Flash timing window (issue #1156).
//
// The card animation is CSS; this controller owns only the "is the flash
// active?" boolean so the 4 s window, restart-on-new-revision and cleanup rules
// are testable without a DOM. The hook is a thin React wrapper around it.
export const SILENT_FLASH_MS = 4000;

export function createFlashWindow({
  duration = SILENT_FLASH_MS,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  onChange = () => {},
} = {}) {
  let at = null;
  let timer = null;

  const stopTimer = () => {
    if (timer === null) return;
    clearTimeoutFn(timer);
    timer = null;
  };

  return {
    // A new revision starts (or restarts) the window. The same revision never
    // re-triggers, and an empty revision does not flash.
    trigger(nextAt) {
      if (!nextAt || nextAt === at) return false;
      at = nextAt;
      stopTimer();
      onChange(true);
      timer = setTimeoutFn(() => {
        timer = null;
        at = null;
        onChange(false);
      }, duration);
      return true;
    },
    clear() {
      stopTimer();
      at = null;
      onChange(false);
    },
  };
}
