export const SONG_REQUEST_MAX_LENGTH = 120;
const ROOM_CODE_PATTERN = /^[a-z0-9]{6,12}$/;

function hasControlChars(value) {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

export function normalizeRoomCode(value) {
  const code = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return ROOM_CODE_PATTERN.test(code) ? code : null;
}

export function normalizeSongRequestInput({ song, artist } = {}) {
  const cleanSong = typeof song === 'string' ? song.trim() : '';
  const cleanArtist = typeof artist === 'string' ? artist.trim() : '';

  if (!cleanSong || !cleanArtist) {
    return { ok: false, error: 'Enter both the song and the artist.' };
  }
  if (cleanSong.length > SONG_REQUEST_MAX_LENGTH || cleanArtist.length > SONG_REQUEST_MAX_LENGTH) {
    return {
      ok: false,
      error: `Keep the song and artist under ${SONG_REQUEST_MAX_LENGTH} characters each.`,
    };
  }
  if (hasControlChars(cleanSong) || hasControlChars(cleanArtist)) {
    return { ok: false, error: 'Remove line breaks and control characters.' };
  }

  return { ok: true, value: { song: cleanSong, artist: cleanArtist } };
}

export function parseSongRequestPath(pathname = '', search = '', baseUrl = '/') {
  let rest = pathname || '';
  if (baseUrl && baseUrl !== '/' && rest.startsWith(baseUrl)) {
    rest = rest.slice(baseUrl.length);
  }
  const segments = rest.split('/').filter(Boolean);
  if (segments[0] !== 'request') return null;

  const queryRoom = new URLSearchParams(search).get('room') ?? '';
  const roomCode = normalizeRoomCode(queryRoom || segments[1] || '');
  return roomCode ? { roomCode } : null;
}

export function isSongRequestPath(pathname = '', baseUrl = '/') {
  return Boolean(parseSongRequestPath(pathname, '', baseUrl));
}

export function buildSongRequestPath(roomCode) {
  const code = normalizeRoomCode(roomCode);
  return code ? `/request/${code}` : null;
}

export function buildSongRequestUrl({ origin = '', baseUrl = '/', roomCode } = {}) {
  const path = buildSongRequestPath(roomCode);
  if (!path) return null;
  const base = `${origin}${baseUrl}`.replace(/\/+$/, '');
  return `${base}${path}`;
}

export function normalizeGuestDeviceId(value) {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  return /^[A-Za-z0-9-]{8,64}$/.test(id) ? id : null;
}

function retryAfter(data) {
  const seconds = Number(data?.retryAfterSeconds ?? data?.retry_after_seconds);
  const minutes = Number(data?.retryAfterMinutes ?? data?.retry_after_minutes);
  if (Number.isFinite(minutes) && minutes > 0) return Math.ceil(minutes);
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds / 60);
  return null;
}

export async function probeSongRequestService({
  config,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!config?.enabled || !config?.functionsUrl || typeof fetchImpl !== 'function') {
    return false;
  }
  try {
    const response = await fetchImpl(`${config.functionsUrl}/submit_song_request`, {
      method: 'OPTIONS',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function submitSongRequest({
  config,
  roomCode,
  song,
  artist,
  deviceId = null,
  fetchImpl = globalThis.fetch,
} = {}) {
  const code = normalizeRoomCode(roomCode);
  if (!code) {
    return { ok: false, error: 'This request link is incomplete. Scan the QR code again.' };
  }

  const input = normalizeSongRequestInput({ song, artist });
  if (!input.ok) return input;

  if (!config?.enabled || !config?.functionsUrl || typeof fetchImpl !== 'function') {
    return { ok: false, error: 'Song requests are not available right now.' };
  }

  try {
    const response = await fetchImpl(`${config.functionsUrl}/submit_song_request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
      body: JSON.stringify({
        roomCode: code,
        song: input.value.song,
        artist: input.value.artist,
        ...(normalizeGuestDeviceId(deviceId) ? { device_id: normalizeGuestDeviceId(deviceId) } : {}),
      }),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      if (response.status === 429) {
        const minutes = retryAfter(data);
        if (minutes) {
          return {
            ok: false,
            code: 'cooldown',
            retryAfterMinutes: minutes,
            error:
              typeof data?.error === 'string' && data.error.trim()
                ? data.error.trim()
                : 'Please wait before sending another request.',
          };
        }
      }
      return {
        ok: false,
        error:
          typeof data?.error === 'string' && data.error.trim()
            ? data.error.trim()
            : 'The request could not be sent. Try again shortly.',
      };
    }

    const requestId =
      data?.requestId ?? data?.request_id ?? data?.request?.id ?? data?.id ?? null;
    return requestId ? { ok: true, requestId: String(requestId) } : { ok: true };
  } catch {
    return {
      ok: false,
      error: 'The request could not be sent. Check the connection and try again.',
    };
  }
}
