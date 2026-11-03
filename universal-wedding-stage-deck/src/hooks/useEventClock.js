import { useEffect, useState } from 'react';

// One shared ticking clock for every stage view (project.md P0.6 /
// Phase 1.5). It ticks once per second and applies the server-time offset so a
// device with a wrong clock still shows the room's authoritative time.
//
// Instantiate it once (in `App`) and pass `now` down; do not start a timer per
// view. The offset itself comes from `useLiveStageState` (server time probe).
export function useEventClock({ serverTimeOffsetMs = 0 } = {}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return new Date(nowMs + (Number.isFinite(serverTimeOffsetMs) ? serverTimeOffsetMs : 0));
}

export default useEventClock;
