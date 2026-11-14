import { useCallback, useSyncExternalStore } from 'react';

export const COMPACT_QUERY = '(max-width: 639px)';

function mediaMatches(query) {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(query).matches
  );
}

/**
 * Shared phone/compact breakpoint hook. Every role view uses the same query so
 * the RoleShell, view layout and bottom bar cannot disagree at 639/640px.
 *
 * `matchMedia` is an external store, so `useSyncExternalStore` subscribes to it
 * directly instead of mirroring it into state from an effect.
 */
export default function useCompact(query = COMPACT_QUERY) {
  const subscribe = useCallback(
    (onChange) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => {};
      }
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => mediaMatches(query), [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
