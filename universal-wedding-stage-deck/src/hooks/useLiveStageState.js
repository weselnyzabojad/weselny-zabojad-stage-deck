import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addManualOffset as addManualOffsetState,
  clearManualOffset as clearManualOffsetState,
  deferStepToJoker,
  loadLiveState,
  markStepDone,
  normalizeLiveState,
  restoreDeferredStep as restoreDeferredStepState,
  saveLiveState,
  setActiveSpeech as setActiveSpeechState,
  storageKey,
  swapStepWithNext,
  toggleSubtask as toggleSubtaskState,
  undoStep,
} from '../lib/liveStageState';
import { sendStagePing as sendStagePingState } from '../lib/stagePings';
import { getSyncConfig, syncRoomKey } from '../lib/sync/syncConfig';
import { createSupabaseSyncClient } from '../lib/sync/supabaseSyncClient';

const PUBLISH_DEBOUNCE_MS = 200;
const SERVER_TIME_REFRESH_MS = 5 * 60 * 1000;

// State machine for the on-stage timeline. Hydrates from localStorage on mount,
// mirrors every transition back to localStorage (offline fallback), follows
// writes from other tabs, and — when the device is paired and Supabase env vars
// are present — mirrors the same payload through a Realtime room channel.
// `eventDateISO` + `timeZone` migrate legacy HH:MM actual timestamps to ISO.
export function useLiveStageState({
  steps,
  weddingId,
  roomId = null,
  initialLiveState,
  eventDateISO = null,
  timeZone = 'UTC',
  accessToken = null,
  requireToken = false,
}) {
  const key = storageKey(weddingId);
  const eventContext = useMemo(
    () => ({ eventDateISO, timeZone }),
    [eventDateISO, timeZone],
  );
  const [liveState, setLiveState] = useState(
    () =>
      loadLiveState(key, steps, eventContext) ??
      normalizeLiveState(initialLiveState, steps, eventContext),
  );
  const [savedLocally, setSavedLocally] = useState(true);
  // Offset between the authoritative server clock and this device, used by the
  // reel clock's skew warning. `available` is false until a probe succeeds.
  const [serverTime, setServerTime] = useState({ offsetMs: 0, available: false });

  const syncConfig = useMemo(() => getSyncConfig(), []);
  // Production rooms only sync with a role token from join_room; the token also
  // authorizes the RLS policies. Local mode keeps the legacy anon client.
  const canSync =
    syncConfig.enabled && Boolean(roomId) && (!requireToken || Boolean(accessToken));
  const client = useMemo(
    () => (canSync ? createSupabaseSyncClient(syncConfig, { accessToken }) : null),
    [canSync, syncConfig, accessToken],
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
        const next = normalizeLiveState(JSON.parse(event.newValue), steps, eventContext);
        lastSerializedRef.current = JSON.stringify(next);
        setLiveState(next);
      } catch {
        // Ignore malformed payloads written by other tabs/clients.
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key, steps, eventContext]);

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

      const next = normalizeLiveState(payload.state, steps, eventContext);
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
  }, [client, roomKey, steps, eventContext]);

  // Probe the authoritative server clock so the reel clock can warn about a
  // device clock that is more than ~30s off. Refresh periodically and after
  // reconnect; failures leave the warning hidden instead of blocking the app.
  useEffect(() => {
    if (!client) return undefined;

    let cancelled = false;

    const probe = () => {
      client
        .fetchServerTime()
        .then((serverMs) => {
          if (cancelled) return;
          setServerTime({ offsetMs: serverMs - Date.now(), available: true });
        })
        .catch(() => {
          if (!cancelled) setServerTime((prev) => ({ ...prev, available: false }));
        });
    };

    probe();
    const interval = setInterval(probe, SERVER_TIME_REFRESH_MS);
    window.addEventListener('online', probe);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('online', probe);
    };
  }, [client]);

  // Push local transitions to the room, debounced so rapid taps collapse.
  useEffect(() => {
    if (!client || hydration.client !== client || hydration.room !== roomKey) return undefined;
    if (serialized === lastPublishedRef.current) return undefined;
    // Don't bounce a payload the cloud just sent us back to the cloud.
    if (serialized === lastAdoptedRef.current) return undefined;

    const payload = JSON.parse(serialized);
    const timer = setTimeout(() => {
      client
        .publish(roomKey, payload)
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
  }, [client, hydration, serialized, roomKey]);

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

  const addManualOffset = useCallback((minutes = 15) => {
    setLiveState((state) => addManualOffsetState(state, minutes));
  }, []);

  const clearManualOffset = useCallback(() => {
    setLiveState((state) => clearManualOffsetState(state));
  }, []);

  const swapWithNext = useCallback(() => {
    setLiveState((state) => swapStepWithNext(state, steps));
  }, [steps]);

  const deferToJokerDrawer = useCallback(() => {
    setLiveState((state) => deferStepToJoker(state, steps));
  }, [steps]);

  const restoreDeferredStep = useCallback((stepId) => {
    setLiveState((state) => restoreDeferredStepState(state, stepId, steps));
  }, [steps]);

  const selectSpeech = useCallback((speechId) => {
    setLiveState((state) => setActiveSpeechState(state, speechId));
  }, []);

  return {
    liveState,
    markCurrentDone,
    undoLastStep,
    toggleSubtask,
    sendStagePing,
    addManualOffset,
    clearManualOffset,
    swapWithNext,
    deferToJokerDrawer,
    restoreDeferredStep,
    selectSpeech,
    savedLocally,
    syncStatus: client ? syncStatus : 'disabled',
    syncEnabled: Boolean(client),
    syncConfigured: syncConfig.enabled,
    syncError,
    remoteUpdatedAt,
    serverTimeOffsetMs: serverTime.offsetMs,
    serverTimeAvailable: serverTime.available,
  };
}
