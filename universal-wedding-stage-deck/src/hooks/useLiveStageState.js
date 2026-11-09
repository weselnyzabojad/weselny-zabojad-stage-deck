import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  loadLiveState,
  appendMutation,
  markStepDone,
  mergeMutationLogs,
  normalizeLiveState,
  saveLiveState,
  setActiveSpeech as setActiveSpeechState,
  storageKey,
  swapStepWithNext,
  toggleSubtask as toggleSubtaskState,
  undoSnapshot,
  updateGameResult,
} from '../lib/liveStageState';
import { reconcileLiveStateWithCartridge } from '../lib/cartridgeReconciliation';
import { getDeviceId } from '../lib/deviceId';
import { sendStagePing as sendStagePingState } from '../lib/stagePings';
import { getSyncConfig, syncRoomKey } from '../lib/sync/syncConfig';
import { createSupabaseSyncClient } from '../lib/sync/supabaseSyncClient';
import {
  clearOutbox as clearStoredOutbox,
  enqueueOutbox,
  loadOutbox,
  outboxRetryDelayMs,
  recordOutboxFailure,
  saveOutbox,
  wakeOutbox as wakeOutboxEntry,
} from '../lib/sync/outbox';

const PUBLISH_DEBOUNCE_MS = 200;
const SERVER_TIME_REFRESH_MS = 5 * 60 * 1000;
const MAX_UNDO_STEPS = 25;

// State machine for the on-stage timeline. Hydrates from localStorage on mount,
// mirrors every transition back to localStorage (offline fallback), follows
// writes from other tabs, and — when the device is paired and Supabase env vars
// are present — mirrors the same payload through a Realtime room channel.
//
// P0.7: every user command pushes an in-memory snapshot on an undo stack, and
// each transition appends to the synced, append-only `mutation_log`. Remote or
// cross-tab state clears the local undo stack (undoing another device's change
// from this tablet would be unsafe).
export function useLiveStageState({
  steps,
  weddingId,
  roomId = null,
  initialLiveState,
  eventDateISO = null,
  timeZone = 'UTC',
  accessToken = null,
  requireToken = false,
  role = 'mc',
  cartridgeRevision = null,
  speeches = [],
}) {
  const key = storageKey(weddingId);
  const eventContext = useMemo(
    () => ({ eventDateISO, timeZone }),
    [eventDateISO, timeZone],
  );
  const [model, setModel] = useState(() => ({
    state:
      loadLiveState(key, steps, eventContext) ??
      normalizeLiveState(initialLiveState, steps, eventContext),
    undo: [],
  }));
  const liveState = model.state;
  const [savedLocally, setSavedLocally] = useState(true);
  // Offset between the authoritative server clock and this device, used by the
  // reel clock's skew warning. `available` is false until a probe succeeds.
  const [serverTime, setServerTime] = useState({ offsetMs: 0, available: false });

  const deviceId = useMemo(() => getDeviceId(), []);
  const actor = useMemo(() => ({ deviceId, role }), [deviceId, role]);

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

  // Presence heartbeat for the owner admin panel (issue #76). Production role
  // tokens carry the session jti; revoked sessions stop updating immediately.
  useEffect(() => {
    if (!client || !accessToken || typeof document === 'undefined') return undefined;
    let disposed = false;
    const beat = () => {
      if (disposed) return;
      client.touchPresence(liveState.active_step_id ?? null).catch(() => {
        // A revoked/expired session must not interrupt the live stage.
      });
    };
    beat();
    const interval = setInterval(beat, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') beat();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [client, accessToken, liveState.active_step_id]);

  const [syncStatus, setSyncStatus] = useState(() => {
    if (!syncConfig.enabled) return 'disabled';
    return typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'connecting';
  });
  const [syncError, setSyncError] = useState(null);
  const [liveCaughtUp, setLiveCaughtUp] = useState(false);
  const [cartridgeNotices, setCartridgeNotices] = useState([]);
  const [remoteUpdatedAt, setRemoteUpdatedAt] = useState(null);
  // Room + client whose authoritative row has already been fetched. Prevents
  // publishing stale local state into a newly paired room before hydration
  // finishes; keying on the client handles re-pairing to the same room.
  const [hydration, setHydration] = useState({ client: null, room: null });

  // TODO 25: the local outbox records a room whose cloud publish has failed.
  // The live state itself is already persisted by saveLiveState, so the entry
  // only needs retry metadata; the latest snapshot is re-read on each attempt.
  const [outboxState, setOutboxState] = useState(() => ({
    room: roomKey,
    entry: roomKey ? loadOutbox(roomKey) : null,
  }));
  const outbox =
    outboxState.room === roomKey
      ? outboxState.entry
      : roomKey
        ? loadOutbox(roomKey)
        : null;
  const outboxRef = useRef(outbox);

  useEffect(() => {
    outboxRef.current = outbox;
  }, [outbox]);

  const setOutbox = useCallback(
    (entry) => {
      outboxRef.current = entry;
      setOutboxState({ room: roomKey, entry });
    },
    [roomKey],
  );

  // Reconnect or a fresh Realtime subscription ignores the remaining backoff.
  const wakePendingOutbox = useCallback(() => {
    const current = outboxRef.current;
    if (!current) return;
    const next = wakeOutboxEntry(current, new Date());
    saveOutbox(next);
    setOutbox(next);
  }, [setOutbox]);

  const lastSerializedRef = useRef(null);
  const lastPublishedRef = useRef(null);
  const lastAdoptedRef = useRef(null);
  const latestRemoteAtRef = useRef(0);
  const serialized = JSON.stringify(liveState);
  const latestSerializedRef = useRef(serialized);
  const publishingRef = useRef(false);
  const [publishTick, setPublishTick] = useState(0);

  useEffect(() => {
    latestSerializedRef.current = serialized;
  }, [serialized]);

  // Cartridge changes arrive as a new immutable snapshot. Reconcile the live
  // state in place: keep valid progress, current step/speech and the mutation
  // log; only fall back when an active id disappeared. The reconciled snapshot
  // is treated as locally adopted so it is not echoed back as a stage mutation.
  const stateRef = useRef(model.state);
  useEffect(() => {
    stateRef.current = model.state;
  }, [model.state]);
  const reconciledCartridgeRef = useRef(null);

  useEffect(() => {
    if (cartridgeRevision == null) return;
    const revisionKey = `${weddingId}:${cartridgeRevision}`;
    if (reconciledCartridgeRef.current === revisionKey) return;
    reconciledCartridgeRef.current = revisionKey;

    const result = reconcileLiveStateWithCartridge({
      liveState: stateRef.current,
      steps,
      speeches,
    });
    setCartridgeNotices(result.notices);
    if (!result.changed) return;

    lastAdoptedRef.current = JSON.stringify(result.state);
    setModel({ state: result.state, undo: [] });
  }, [cartridgeRevision, weddingId, steps, speeches]);

  const publishLatest = useCallback(
    (snapshot) => {
      if (!client || !roomKey || publishingRef.current) return;

      let payload;
      try {
        payload = JSON.parse(snapshot);
      } catch {
        return;
      }

      publishingRef.current = true;
      client
        .publish(roomKey, payload)
        .then(() => {
          lastPublishedRef.current = snapshot;
          setSyncError(null);
          if (latestSerializedRef.current === snapshot) {
            // The cloud is exactly in sync: the outbox is now empty.
            clearStoredOutbox(roomKey);
            setOutbox(null);
            setSyncStatus((current) => (current === 'error' ? 'connected' : current));
          } else {
            // Local state moved while the write was in flight. Keep the room
            // queued so the newer snapshot is retried immediately.
            setOutbox(enqueueOutbox(roomKey, new Date()));
          }
        })
        .catch((error) => {
          setOutbox(recordOutboxFailure(roomKey, error.message, new Date()));
          setSyncError(error.message);
          setSyncStatus('error');
        })
        .finally(() => {
          publishingRef.current = false;
          // Re-evaluate the effect even if serialized did not change.
          setPublishTick((tick) => tick + 1);
        });
    },
    [client, roomKey, setOutbox],
  );

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
        setModel((prev) => {
          const state = {
            ...next,
            mutation_log: mergeMutationLogs(prev.state.mutation_log, next.mutation_log),
          };
          lastSerializedRef.current = JSON.stringify(state);
          // Another tab changed the show; local undo no longer applies.
          return { state, undo: [] };
        });
      } catch {
        // Ignore malformed payloads written by other tabs/clients.
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key, steps, eventContext]);

  // Subscribe to the room channel and hydrate from the authoritative row.
  // Realtime events are hints; reconnect/online always triggers a fresh fetch so
  // missed events cannot leave this device behind.
  useEffect(() => {
    if (!client) return undefined;

    // A new pairing opens a new room: forget per-room echo guards.
    lastPublishedRef.current = null;
    lastAdoptedRef.current = null;
    latestRemoteAtRef.current = 0;
    setLiveCaughtUp(false);

    let cancelled = false;

    const applyRemote = (payload) => {
      if (!payload?.state) return;

      // Realtime + the initial fetch can race; never let an older row win.
      const remoteAt = Date.parse(payload.updated_at ?? '') || 0;
      if (remoteAt && remoteAt < latestRemoteAtRef.current) return;
      if (remoteAt) latestRemoteAtRef.current = remoteAt;

      const next = normalizeLiveState(payload.state, steps, eventContext);
      const nextSerialized = JSON.stringify(next);
      if (payload.updated_at) setRemoteUpdatedAt(payload.updated_at);
      setModel((prev) => {
        if (JSON.stringify(prev.state) === nextSerialized) return prev;
        // Keep local audit entries when adopting remote state.
        const merged = {
          ...next,
          mutation_log: mergeMutationLogs(prev.state.mutation_log, next.mutation_log),
        };
        lastAdoptedRef.current = JSON.stringify(merged);
        // Remote state wins; local undo would revert another device's change.
        return { state: merged, undo: [] };
      });
    };

    const catchUp = () =>
      client
        .fetchLatest(roomKey)
        .then((row) => {
          if (cancelled) return;
          if (row?.state) {
            applyRemote({ state: row.state, updated_at: row.updated_at, pin: row.pin });
          }
          setHydration({ client, room: roomKey });
          setLiveCaughtUp(true);
          setSyncStatus((current) => (current === 'error' ? 'error' : 'connected'));
        })
        .catch((error) => {
          if (cancelled) return;
          // Stay usable offline; the local mirror keeps the show running.
          setSyncError(error.message);
          setHydration({ client, room: roomKey });
          setLiveCaughtUp(false);
          setSyncStatus(
            typeof navigator !== 'undefined' && navigator.onLine === false
              ? 'offline'
              : 'error',
          );
        });

    const unsubscribe = client.subscribe(roomKey, {
      onState: (payload) => {
        if (!cancelled) applyRemote(payload);
      },
      onStatus: (status, message) => {
        if (cancelled) return;
        if (status === 'connected') {
          // Keep the badge non-green until the authoritative catch-up finishes.
          setSyncStatus('connecting');
          setSyncError(null);
          // Realtime is back: do not wait out the remaining outbox backoff.
          wakePendingOutbox();
          void catchUp();
          return;
        }
        setSyncStatus(status);
        if (status === 'connecting' || status === 'disconnected') {
          setLiveCaughtUp(false);
        }
        if (status === 'error') {
          setSyncError(message ?? 'Realtime channel error');
        }
      },
    });

    // Always fetch after subscribing, even if no Realtime event arrives.
    void catchUp();

    const handleOnline = () => {
      if (cancelled) return;
      setSyncStatus('connecting');
      setLiveCaughtUp(false);
      void catchUp();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener('online', handleOnline);
    };
  }, [client, roomKey, steps, eventContext, wakePendingOutbox]);

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

  // Push local transitions to the room. A clean publish uses the short
  // debounce; a queued outbox entry uses its exponential backoff. The effect
  // always sends the newest local snapshot, never a stale queued payload.
  useEffect(() => {
    if (!client || hydration.client !== client || hydration.room !== roomKey) return undefined;
    if (serialized === lastPublishedRef.current) return undefined;
    // Don't bounce a payload the cloud just sent us back to the cloud, unless a
    // failure left an outbox entry that still needs confirmation.
    if (!outbox && serialized === lastAdoptedRef.current) return undefined;

    const delay = outbox ? outboxRetryDelayMs(outbox, new Date()) : PUBLISH_DEBOUNCE_MS;
    const timer = setTimeout(() => {
      publishLatest(latestSerializedRef.current);
    }, delay);

    return () => clearTimeout(timer);
  }, [client, hydration, serialized, roomKey, outbox, publishTick, publishLatest]);

  useEffect(() => {
    if (!client) return undefined;

    const handleOnline = () => {
      setSyncStatus('connecting');
      wakePendingOutbox();
    };
    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [client, wakePendingOutbox]);

  // Apply a user command and push the previous state on the undo stack.
  const apply = useCallback((updater, meta = {}) => {
    setModel((current) => {
      const next = updater(current.state);
      if (!next || next === current.state) return current;

      const entry = {
        state: current.state,
        op: meta.op ?? 'change',
        label: meta.label ?? meta.op ?? 'Change',
        at: Date.now(),
      };
      return {
        state: next,
        undo:
          meta.undo === false
            ? current.undo
            : [...current.undo.slice(-(MAX_UNDO_STEPS - 1)), entry],
      };
    });
  }, []);

  const markCurrentDone = useCallback(() => {
    apply((state) => markStepDone(state, steps, new Date(), actor), {
      op: 'complete_step',
      label: 'Step completed',
    });
  }, [apply, steps, actor]);

  // Generic undo: covers completion, swap, subtask and speech selection. Each
  // snapshot is the exact previous state.
  const undoLastStep = useCallback(() => {
    setModel((current) => {
      if (current.undo.length === 0) return current;
      const last = current.undo[current.undo.length - 1];
      const restored = undoSnapshot(current.state, last.state, {
        actor,
        now: new Date(),
        targetOp: last.op,
      });
      return { state: restored, undo: current.undo.slice(0, -1) };
    });
  }, [actor]);

  const toggleSubtask = useCallback(
    (task) => {
      apply((state) => toggleSubtaskState(state, task, actor), {
        op: 'toggle_subtask',
        label: 'Subtask changed',
      });
    },
    [apply, actor],
  );

  // Stage pings are a transient cue, not a schedule command: no undo entry.
  const sendStagePing = useCallback((type) => {
    setModel((current) => ({
      ...current,
      state: sendStagePingState(current.state, type, { stepId: current.state.active_step_id }),
    }));
  }, []);

  const swapWithNext = useCallback(() => {
    apply((state) => swapStepWithNext(state, steps, new Date(), actor), {
      op: 'swap',
      label: 'Swapped steps',
    });
  }, [apply, steps, actor]);

  const selectSpeech = useCallback(
    (speechId) => {
      apply((state) => setActiveSpeechState(state, speechId, actor), {
        op: 'select_speech',
        label: 'Speech selection',
      });
    },
    [apply, actor],
  );

  // Game results are durable state but never an undoable timeline command.
  const setGameResults = useCallback(
    (gameId, result) => {
      apply((state) => updateGameResult(state, gameId, result, actor), {
        op: 'game_results',
        label: 'Game results',
        undo: false,
      });
    },
    [apply, actor],
  );

  // Shared, audited media override (for example the mini-session time chosen
  // by a photographer). Stored in live state so every media device receives it.
  const setMediaOverride = useCallback(
    (key, value) => {
      if (typeof key !== 'string' || !key) return;
      apply(
        (state) => {
          const previous = state.media_overrides?.[key] ?? null;
          const next = {
            ...state,
            media_overrides: {
              ...(state.media_overrides ?? {}),
              [key]: { value, updatedAt: new Date().toISOString(), role: actor.role },
            },
          };
          return appendMutation(next, actor, 'media_override', {
            key,
            previous,
            value,
          });
        },
        { op: 'media_override', label: 'Media override changed' },
      );
    },
    [apply, actor],
  );

  const lastUndo = model.undo.length > 0 ? model.undo[model.undo.length - 1] : null;

  return {
    liveState,
    markCurrentDone,
    undoLastStep,
    canUndo: model.undo.length > 0,
    lastUndo,
    toggleSubtask,
    sendStagePing,
    swapWithNext,
    selectSpeech,
    setGameResults,
    setMediaOverride,
    savedLocally,
    syncStatus: client ? syncStatus : 'disabled',
    syncEnabled: Boolean(client),
    syncConfigured: syncConfig.enabled,
    syncError,
    outbox,
    remoteUpdatedAt,
    liveCaughtUp,
    cartridgeNotices,
    serverTimeOffsetMs: serverTime.offsetMs,
    serverTimeAvailable: serverTime.available,
  };
}
