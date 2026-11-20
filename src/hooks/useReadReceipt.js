import { useCallback, useEffect, useRef, useState } from 'react';
import { shouldAck } from '../lib/readReceipts.js';

// Provider-side acknowledgement (issue #1158).
//
// Marks the current reschedule revision as seen when the app becomes visible or
// when the provider first interacts with the screen. Exactly one successful ack
// per (step, revision); a failed ack is retried on the next trigger. The hook
// never blocks, never toasts and never polls.
const ACK_EVENTS = ['pointerdown', 'touchstart', 'keydown', 'scroll'];

export function useReadReceipt({ stepId = null, revision = null, enabled = false, client = null } = {}) {
  const key = stepId && revision ? `${stepId}@${revision}` : null;
  const [ackedKey, setAckedKey] = useState(null);
  const ackedKeyRef = useRef(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(false);

  const attempt = useCallback(() => {
    const visible =
      typeof document === 'undefined' || document.visibilityState === 'visible';
    if (
      !shouldAck({
        enabled,
        key,
        ackedKey: ackedKeyRef.current,
        inFlight: inFlightRef.current,
        visible,
      })
    ) {
      return;
    }

    inFlightRef.current = true;
    Promise.resolve(client.ackStepReceipt({ stepId, revision }))
      .then(() => {
        ackedKeyRef.current = key;
        if (mountedRef.current) setAckedKey(key);
      })
      .catch(() => {
        // Best effort: the next visibility change or interaction retries.
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [client, enabled, key, revision, stepId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !key || typeof document === 'undefined') return undefined;

    const onInteraction = () => attempt();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') attempt();
    };

    for (const event of ACK_EVENTS) {
      document.addEventListener(event, onInteraction, { passive: true });
    }
    document.addEventListener('visibilitychange', onVisibility);

    // The screen may already be active when the view mounts.
    attempt();

    return () => {
      for (const event of ACK_EVENTS) {
        document.removeEventListener(event, onInteraction);
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [attempt, enabled, key]);

  return { acknowledged: Boolean(key) && ackedKey === key };
}
