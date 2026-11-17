import { useEffect, useRef, useState } from 'react';
import { createFlashWindow } from '../lib/flashWindow.js';

// React wrapper for the Silent Flash window. The first render records the
// current revision without flashing; only a later `at` change starts the glow,
// so opening a view after a reschedule does not pulse on mount.
export function useSilentFlash(flash) {
  const [active, setActive] = useState(false);
  const windowRef = useRef(null);
  const seenAtRef = useRef(flash?.at ?? null);

  if (windowRef.current === null) {
    windowRef.current = createFlashWindow({ onChange: setActive });
  }

  const at = flash?.at ?? null;

  useEffect(() => {
    if (at === seenAtRef.current) return;
    seenAtRef.current = at;
    if (!at) windowRef.current?.clear();
    else windowRef.current?.trigger(at);
  }, [at]);

  useEffect(
    () => () => {
      windowRef.current?.clear();
    },
    [],
  );

  return active;
}
