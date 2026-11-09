export const GUEST_REQUEST_STORAGE_PREFIX = 'wzsd:guest-song-request:';
const STATUSES = new Set(['pending', 'accepted', 'declined']);

export function guestRequestStorageKey(roomCode) {
  return `${GUEST_REQUEST_STORAGE_PREFIX}${roomCode}`;
}

export function normalizeGuestRequestStatus(row) {
  if (!row || typeof row !== 'object') return null;
  const playedAt = row.played_at ?? row.playedAt ?? null;
  const rawStatus = STATUSES.has(row.status) ? row.status : 'pending';
  return {
    id: typeof row.id === 'string' ? row.id : null,
    status: playedAt ? 'played' : rawStatus,
    playedAt: typeof playedAt === 'string' ? playedAt : null,
    song: typeof row.song === 'string' ? row.song.trim() : '',
    artist: typeof row.artist === 'string' ? row.artist.trim() : '',
  };
}

export function loadGuestRequest(roomCode, {
  storage = typeof window === 'undefined' ? null : window.localStorage,
} = {}) {
  try {
    const raw = storage?.getItem(guestRequestStorageKey(roomCode));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.deviceId !== 'string' || !parsed.deviceId) return null;
    return {
      requestId: typeof parsed.requestId === 'string' ? parsed.requestId : null,
      deviceId: parsed.deviceId,
      song: typeof parsed.song === 'string' ? parsed.song : '',
      artist: typeof parsed.artist === 'string' ? parsed.artist : '',
      status: STATUSES.has(parsed.status) || parsed.status === 'played' ? parsed.status : 'pending',
      submittedAt: typeof parsed.submittedAt === 'string' ? parsed.submittedAt : null,
    };
  } catch {
    return null;
  }
}

export function saveGuestRequest(roomCode, record, {
  storage = typeof window === 'undefined' ? null : window.localStorage,
} = {}) {
  try {
    storage?.setItem(guestRequestStorageKey(roomCode), JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function clearGuestRequest(roomCode, {
  storage = typeof window === 'undefined' ? null : window.localStorage,
} = {}) {
  try {
    storage?.removeItem(guestRequestStorageKey(roomCode));
  } catch {
    // Ignore blocked storage.
  }
}

export async function fetchGuestRequestStatus({
  config,
  roomCode,
  requestId,
  deviceId,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!config?.enabled || !config?.functionsUrl || typeof fetchImpl !== 'function') {
    return { ok: false, error: 'Song requests are not available right now.' };
  }
  if (!requestId || !deviceId) {
    return { ok: false, error: 'The request status is unavailable.' };
  }

  try {
    const response = await fetchImpl(`${config.functionsUrl}/get_song_request_status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
      body: JSON.stringify({ roomCode, requestId, device_id: deviceId }),
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    if (!response.ok) {
      return {
        ok: false,
        error:
          typeof data?.error === 'string' && data.error.trim()
            ? data.error.trim()
            : 'The request status is unavailable.',
      };
    }
    const request = normalizeGuestRequestStatus(data?.request ?? data);
    if (!request) {
      return { ok: false, error: 'The request status is unavailable.' };
    }
    if (request.id && requestId && request.id !== requestId) {
      return { ok: false, error: 'The request status is unavailable.' };
    }
    return { ok: true, request };
  } catch {
    return { ok: false, error: 'Check the connection to refresh the request status.' };
  }
}

// Polling is the fallback transport from #456: the guest never reads the queue
// table directly, only their own request row through the status endpoint.
export function subscribeGuestRequestStatus({
  config,
  roomCode,
  requestId,
  deviceId,
  onUpdate,
  onError = null,
  intervalMs = 5000,
  fetchImpl = globalThis.fetch,
  setIntervalImpl = globalThis.setInterval,
  clearIntervalImpl = globalThis.clearInterval,
  isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false,
} = {}) {
  let stopped = false;
  let inFlight = false;

  const poll = async () => {
    if (stopped || inFlight || !isOnline()) return;
    inFlight = true;
    try {
      const result = await fetchGuestRequestStatus({
        config,
        roomCode,
        requestId,
        deviceId,
        fetchImpl,
      });
      if (stopped) return;
      if (result.ok) onUpdate?.(result.request);
      else if (result.error) onError?.(result.error);
    } finally {
      inFlight = false;
    }
  };

  poll();
  const timer = setIntervalImpl(poll, intervalMs);
  return () => {
    stopped = true;
    clearIntervalImpl(timer);
  };
}
