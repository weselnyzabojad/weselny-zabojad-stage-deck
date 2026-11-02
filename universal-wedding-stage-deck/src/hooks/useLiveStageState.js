import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  loadLiveState,
  markStepDone,
  normalizeLiveState,
  saveLiveState,
  storageKey,
  toggleSubtask as toggleSubtaskState,
  undoStep,
} from '../lib/liveStageState';
import { sendStagePing as sendStagePingState } from '../lib/stagePings';
import { getSyncConfig, syncRoomKey } from '../lib/sync/syncConfig';
import { createSupabaseSyncClient } from '../lib/sync/supabaseSyncClient';

const PUBLISH_DEBOUNCE_MS = 200;

// State machine for the on-stage timeline. Hydrates from localStorage on mount,
// mirrors every transition back to localStorage (offline fallback), follows
// writes from other tabs, and — when the device is paired and Supabase env vars
// are present — mirrors the same payload through a Realtime room channel.
export function useLiveStageState({ steps, weddingId, roomId = null, syncPin = null, initialLiveState }) {
  const key = storageKey(weddingId);
  const [liveState, setLiveState] = useState(
    () => loadLiveState(key, steps) ?? normalizeLiveState(initialLiveState, steps),
  );
  const [savedLocally, setSavedLocally] = useState(true);

  const syncConfig = useMemo(() => getSyncConfig(), []);
  const canSync = syncConfig.enabled && Boolean(roomId);
  const client = useMemo(
    () => (canSync ? createSupabaseSyncClient(syncConfig) : null),
    [canSync, syncConfig],
  );
  const roomKey = client ? syncRoomKey(syncConfig.roomPrefix, roomId) : '';

  const [syncStatus, setSyncStatus] = useState(() => {
    if (!syncConfig.enabled) return 'disabled';
    return typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'connecting';
  });
  const [syncError, setSyncError] = useState(null);
  const [remoteUpdatedAt, setRemoteUpdatedAt] = useState(null);
  // Room + client whose authoritative row has already been fetched. Prevents
  // publishing stale local state into a newly paired room before hydration
  // finishes; keying on the client handles re-pairing to the same room.
  const [hydration, setHydration] = useState({ client: null, room: null });

  const lastSerializedRef = useRef(null);
  const lastPublishedRef = useRef(null);
  const lastAdoptedRef = useRef(null);
  const latestRemoteAtRef = useRef(0);
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

  // Subscribe to the room channel and hydrate from the authoritative row once.
  useEffect(() => {
    if (!client) return undefined;

    // A new pairing opens a new room: forget per-room echo guards.
    lastPublishedRef.current = null;
    lastAdoptedRef.current = null;
    latestRemoteAtRef.current = 0;

    let cancelled = false;

    const applyRemote = (payload) => {
      if (!payload?.state) return;

      // Realtime + the initial fetch can race; never let an older row win.
      const remoteAt = Date.parse(payload.updated_at ?? '') || 0;
      if (remoteAt && remoteAt < latestRemoteAtRef.current) return;
      if (remoteAt) latestRemoteAtRef.current = remoteAt;

      const next = normalizeLiveState(payload.state, steps);
      const nextSerialized = JSON.stringify(next);
      lastAdoptedRef.current = nextSerialized;
      if (payload.updated_at) setRemoteUpdatedAt(payload.updated_at);
      setLiveState((prev) => (JSON.stringify(prev) === nextSerialized ? prev : next));
    };

    const unsubscribe = client.subscribe(roomKey, {
      onState: (payload) => {
        if (!cancelled) applyRemote(payload);
      },
      onStatus: (status, message) => {
        if (cancelled) return;
        setSyncStatus(status);
        if (status === 'error') {
          setSyncError(message ?? 'Realtime channel error');
        } else if (status === 'connected') {
          setSyncError(null);
        }
      },
    });

    client
      .fetchLatest(roomKey)
      .then((row) => {
        if (cancelled) return;
        if (row?.state) {
          applyRemote({ state: row.state, updated_at: row.updated_at, pin: row.pin });
        }
        setHydration({ client, room: roomKey });
      })
      .catch((error) => {
        if (cancelled) return;
        // Stay usable offline; the local mirror keeps the show running.
        setSyncError(error.message);
        setHydration({ client, room: roomKey });
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [client, roomKey, steps]);

  // Push local transitions to the room, debounced so rapid taps collapse.
  useEffect(() => {
    if (!client || hydration.client !== client || hydration.room !== roomKey) return undefined;
    if (serialized === lastPublishedRef.current) return undefined;
    // Don't bounce a payload the cloud just sent us back to the cloud.
    if (serialized === lastAdoptedRef.current) return undefined;

    const payload = JSON.parse(serialized);
    const timer = setTimeout(() => {
      client
        .publish(roomKey, payload, { pin: syncPin })
        .then(() => {
          lastPublishedRef.current = serialized;
          setSyncError(null);
        })
        .catch((error) => {
          setSyncError(error.message);
          setSyncStatus('error');
        });
    }, PUBLISH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [client, hydration, serialized, roomKey, syncPin]);

  useEffect(() => {
    if (!client) return undefined;

    const handleOnline = () => setSyncStatus('connecting');
    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [client]);

  const markCurrentDone = useCallback(() => {
    setLiveState((state) => markStepDone(state, steps));
  }, [steps]);

  const undoLastStep = useCallback(() => {
    setLiveState((state) => undoStep(state));
  }, []);

  const toggleSubtask = useCallback((task) => {
    setLiveState((state) => toggleSubtaskState(state, task));
  }, []);

  const sendStagePing = useCallback((type) => {
    setLiveState((state) => sendStagePingState(state, type, { stepId: state.active_step_id }));
  }, []);

  return {
    liveState,
    markCurrentDone,
    undoLastStep,
    toggleSubtask,
    sendStagePing,
    savedLocally,
    syncStatus: client ? syncStatus : 'disabled',
    syncEnabled: Boolean(client),
    syncConfigured: syncConfig.enabled,
    syncError,
    remoteUpdatedAt,
  };
}
