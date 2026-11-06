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

export async function submitSongRequest({
  config,
  roomCode,
  song,
  artist,
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
      }),
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
            : 'The request could not be sent. Try again shortly.',
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'The request could not be sent. Check the connection and try again.',
    };
  }
}
