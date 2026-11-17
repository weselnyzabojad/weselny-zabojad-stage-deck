// Five-second confirmation window for the MC receipt badges (issue #1160).
//
// A live acknowledgement turns one group green, then the badge returns to its
// neutral state. The tracker owns one timer per group so overlapping
// acknowledgements restart only their own window and unmount clears everything.
export const RECEIPT_CONFIRM_MS = 5000;

export function createConfirmationTracker({
  duration = RECEIPT_CONFIRM_MS,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  onChange = () => {},
} = {}) {
  const timers = new Map();

  return {
    confirm(key) {
      if (!key) return;
      const existing = timers.get(key);
      if (existing !== undefined) clearTimeoutFn(existing);
      onChange(key, true);
      timers.set(
        key,
        setTimeoutFn(() => {
          timers.delete(key);
          onChange(key, false);
        }, duration),
      );
    },
    clear() {
      for (const timer of timers.values()) clearTimeoutFn(timer);
      timers.clear();
    },
  };
}
