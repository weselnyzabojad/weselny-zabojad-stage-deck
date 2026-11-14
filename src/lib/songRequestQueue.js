import { createClient } from '@supabase/supabase-js';

const STATUSES = new Set(['pending', 'accepted', 'declined']);

export function canModerateSongRequests(role) {
  return role === 'mc' || role === 'dj';
}

// Realtime hint for the joined MC/DJ queue. RLS scopes postgres_changes to the
// token's wedding, so the listener receives only this room. The caller still
// refetches authoritative rows; a 30s poll is the fallback when the socket drops.
export function subscribeSongRequestChanges({
  config,
  accessToken,
  onChange,
  onStatus = null,
  channelName = 'song-requests',
} = {}) {
  if (!config?.enabled || !config?.url || !config?.anonKey || !accessToken) {
    return () => {};
  }

  const client = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    realtime: { params: { access_token: accessToken } },
  });
  client.realtime.setAuth(accessToken);

  const channel = client
    .channel(`wzsd:${channelName}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'song_requests' },
      () => onChange?.(),
    )
    .subscribe((status) => onStatus?.(status));

  return () => {
    void client.removeChannel(channel);
  };
}

export function normalizeSongRequestRow(row) {
  if (!row || typeof row !== 'object') return null;
  if (typeof row.id !== 'string' || !row.id) return null;
  if (typeof row.song !== 'string' || !row.song.trim()) return null;
  if (typeof row.artist !== 'string' || !row.artist.trim()) return null;
  if (!STATUSES.has(row.status)) return null;
  return {
    id: row.id,
    song: row.song.trim(),
    artist: row.artist.trim(),
    status: row.status,
    deviceId: typeof row.device_id === 'string' ? row.device_id : row.deviceId ?? null,
    playedAt: typeof row.played_at === 'string' ? row.played_at : row.playedAt ?? null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : row.createdAt ?? null,
  };
}

export function partitionSongRequests(rows = []) {
  const requests = (Array.isArray(rows) ? rows : [])
    .map(normalizeSongRequestRow)
    .filter(Boolean);

  const byOldest = (a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? ''));
  const byNewest = (a, b) => byOldest(b, a);

  return {
    pending: requests.filter((row) => row.status === 'pending').sort(byOldest),
    accepted: requests.filter((row) => row.status === 'accepted').sort(byNewest),
    declined: requests.filter((row) => row.status === 'declined').sort(byNewest),
  };
}

function headers(config, accessToken, extra = {}) {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${accessToken}`,
    ...extra,
  };
}

export async function fetchSongRequests({
  config,
  accessToken,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!config?.enabled || !config?.url || !accessToken || typeof fetchImpl !== 'function') {
    return { ok: false, error: 'The guest request queue is not connected.' };
  }

  try {
    const url = `${config.url.replace(/\/+$/, '')}/rest/v1/song_requests?select=id,song,artist,status,device_id,played_at,created_at&order=created_at.asc&limit=100`;
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: headers(config, accessToken),
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
          typeof data?.message === 'string' && data.message.trim()
            ? data.message.trim()
            : 'Could not load guest requests.',
      };
    }
    return { ok: true, requests: Array.isArray(data) ? data : [] };
  } catch {
    return { ok: false, error: 'Could not load guest requests. Check the connection.' };
  }
}

export async function updateSongRequestStatus({
  config,
  accessToken,
  id,
  status,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!['accepted', 'declined'].includes(status)) {
    return { ok: false, error: 'Invalid request status.' };
  }
  if (!id || !config?.enabled || !config?.url || !accessToken || typeof fetchImpl !== 'function') {
    return { ok: false, error: 'The guest request queue is not connected.' };
  }

  try {
    const url = `${config.url.replace(/\/+$/, '')}/rest/v1/song_requests?id=eq.${encodeURIComponent(id)}&status=eq.pending`;
    const response = await fetchImpl(url, {
      method: 'PATCH',
      headers: headers(config, accessToken, {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify({ status }),
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
          typeof data?.message === 'string' && data.message.trim()
            ? data.message.trim()
            : 'Could not update the request.',
      };
    }
    if (!Array.isArray(data) || data.length === 0) {
      return { ok: false, error: 'This request was already handled. Refresh the queue.' };
    }
    return { ok: true, request: normalizeSongRequestRow(data[0]) };
  } catch {
    return { ok: false, error: 'Could not update the request. Check the connection.' };
  }
}

export async function markSongRequestPlayed({
  config,
  accessToken,
  id,
  playedAt = new Date().toISOString(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!id || !config?.enabled || !config?.url || !accessToken || typeof fetchImpl !== 'function') {
    return { ok: false, error: 'The guest request queue is not connected.' };
  }

  try {
    const url = `${config.url.replace(/\/+$/, '')}/rest/v1/song_requests?id=eq.${encodeURIComponent(id)}&status=eq.accepted&played_at=is.null`;
    const response = await fetchImpl(url, {
      method: 'PATCH',
      headers: headers(config, accessToken, {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify({ played_at: playedAt }),
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
          typeof data?.message === 'string' && data.message.trim()
            ? data.message.trim()
            : 'Could not mark the request as played.',
      };
    }
    if (!Array.isArray(data) || data.length === 0) {
      return { ok: false, error: 'This request was already handled. Refresh the queue.' };
    }
    return { ok: true, request: normalizeSongRequestRow(data[0]) };
  } catch {
    return { ok: false, error: 'Could not mark the request as played. Check the connection.' };
  }
}

