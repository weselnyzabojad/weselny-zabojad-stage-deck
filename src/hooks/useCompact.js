import { useEffect, useState } from 'react';

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
 */
export default function useCompact(query = COMPACT_QUERY) {
  const [compact, setCompact] = useState(() => mediaMatches(query));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const mq = window.matchMedia(query);
    setCompact(mq.matches);
    const listener = () => setCompact(mq.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [query]);

  return compact;
}
