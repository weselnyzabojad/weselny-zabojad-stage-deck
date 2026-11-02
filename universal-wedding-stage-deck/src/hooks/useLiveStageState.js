import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadLiveState,
  markStepDone,
  normalizeLiveState,
  saveLiveState,
  storageKey,
  toggleSubtask as toggleSubtaskState,
  undoStep,
} from '../lib/liveStageState';

// State machine for the on-stage timeline. Hydrates from localStorage on mount,
// mirrors every transition back to localStorage (offline fallback), and follows
// writes from other tabs so a second device/tab stays in step.
export function useLiveStageState({ steps, weddingId, initialLiveState }) {
  const key = storageKey(weddingId);
  const [liveState, setLiveState] = useState(
    () => loadLiveState(key, steps) ?? normalizeLiveState(initialLiveState, steps),
  );
  const [savedLocally, setSavedLocally] = useState(true);
  const lastSerializedRef = useRef(null);
  const serialized = JSON.stringify(liveState);

  useEffect(() => {
    // Skip the echo write after adopting a payload from another tab.
    if (lastSerializedRef.current === serialized) return;
    lastSerializedRef.current = serialized;
    setSavedLocally(saveLiveState(key, liveState));
  }, [key, liveState, serialized]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== key || !event.newValue) return;
      try {
        const next = normalizeLiveState(JSON.parse(event.newValue), steps);
        lastSerializedRef.current = JSON.stringify(next);
        setLiveState(next);
      } catch {
        // Ignore malformed payloads written by other tabs/clients.
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key, steps]);

  const markCurrentDone = useCallback(() => {
    setLiveState((state) => markStepDone(state, steps));
  }, [steps]);

  const undoLastStep = useCallback(() => {
    setLiveState((state) => undoStep(state));
  }, []);

  const toggleSubtask = useCallback((task) => {
    setLiveState((state) => toggleSubtaskState(state, task));
  }, []);

  return { liveState, markCurrentDone, undoLastStep, toggleSubtask, savedLocally };
}
