// Supabase Edge Function: search_song_metadata
//
// Public, advisory song metadata lookup for the guest request form. The guest
// phone only talks to this function; iTunes Search (first choice) and
// MusicBrainz (fallback) are called server-side. No API key, artwork, preview
// URL or third-party id leaves the function.
//
// Privacy/UX contract: docs/song-metadata-validation.md
// Deploy: supabase functions deploy search_song_metadata

type Suggestion = {
  title: string;
  artist: string;
  album?: string;
};

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
const MAX_FIELD_LENGTH = 120;
const MAX_RESULTS = 5;
const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_MAX_ENTRIES = 100;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 20;
const ITUNES_TIMEOUT_MS = 4000;
const MUSICBRAINZ_TIMEOUT_MS = 5000;
const MUSICBRAINZ_MIN_INTERVAL_MS = 1100;
const MUSICBRAINZ_USER_AGENT =
  'WeselnyZabojadStageDeck/1.0 (https://deck.weselnyzabojad.pl)';

const cache = new Map<string, { expiresAt: number; suggestions: Suggestion[] }>();
const rateBuckets = new Map<string, number[]>();
let musicBrainzNextAt = 0;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders() });
}

function cleanText(value: unknown, maxLength = MAX_FIELD_LENGTH) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (!text || text.length > maxLength) return '';
  const hasControlChars = [...text].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
  return hasControlChars ? '' : text;
}

function normalizedKey(song: string, artist: string) {
  return `${song} ${artist}`.trim().toLowerCase();
}

function readCache(key: string) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  // Refresh LRU insertion order.
  cache.delete(key);
  cache.set(key, hit);
  return hit.suggestions;
}

function writeCache(key: string, suggestions: Suggestion[]) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, suggestions });
}

function clientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for') ?? '';
  return forwarded.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

function allowRequest(ip: string) {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_MS;
  const recent = (rateBuckets.get(ip) ?? []).filter((timestamp) => timestamp > windowStart);
  if (recent.length >= RATE_MAX_REQUESTS) {
    rateBuckets.set(ip, recent);
    return false;
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  if (rateBuckets.size > 1000) {
    for (const [key, entries] of rateBuckets) {
      if (entries.every((timestamp) => timestamp <= windowStart)) rateBuckets.delete(key);
    }
  }
  return true;
}

function cleanSuggestion(title: unknown, artist: unknown, album?: unknown): Suggestion | null {
  const cleanTitle = cleanText(title, 160);
  const cleanArtist = cleanText(artist, 160);
  if (!cleanTitle || !cleanArtist) return null;
  const cleanAlbum = cleanText(album, 160);
  return cleanAlbum
    ? { title: cleanTitle, artist: cleanArtist, album: cleanAlbum }
    : { title: cleanTitle, artist: cleanArtist };
}

function dedupe(suggestions: Suggestion[]) {
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const suggestion of suggestions) {
    const key = `${suggestion.title.toLowerCase()}\u0000${suggestion.artist.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(suggestion);
    if (out.length >= MAX_RESULTS) break;
  }
  return out;
}

async function searchItunes(song: string, artist: string) {
  const term = [song, artist].filter(Boolean).join(' ').trim();
  if (!term) return [];

  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('term', term);
  url.searchParams.set('entity', 'song');
  url.searchParams.set('limit', '8');

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(ITUNES_TIMEOUT_MS),
  });
  if (!response.ok) return [];

  const data = await response.json().catch(() => null);
  if (!Array.isArray(data?.results)) return [];

  return dedupe(
    data.results
      .map((item: Record<string, unknown>) =>
        cleanSuggestion(item.trackName, item.artistName, item.collectionName),
      )
      .filter((item): item is Suggestion => Boolean(item)),
  );
}

function escapeLucene(value: string) {
  return value.replace(/["\\]/g, ' ').trim();
}

async function searchMusicBrainz(song: string, artist: string) {
  const clauses = [];
  if (song) clauses.push(`recording:"${escapeLucene(song)}"`);
  if (artist) clauses.push(`artist:"${escapeLucene(artist)}"`);
  if (clauses.length === 0) return [];

  const wait = musicBrainzNextAt - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  musicBrainzNextAt = Date.now() + MUSICBRAINZ_MIN_INTERVAL_MS;

  const url = new URL('https://musicbrainz.org/ws/2/recording');
  url.searchParams.set('query', clauses.join(' AND '));
  url.searchParams.set('fmt', 'json');
  url.searchParams.set('limit', '8');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': MUSICBRAINZ_USER_AGENT,
    },
    signal: AbortSignal.timeout(MUSICBRAINZ_TIMEOUT_MS),
  });
  if (!response.ok) return [];

  const data = await response.json().catch(() => null);
  if (!Array.isArray(data?.recordings)) return [];

  return dedupe(
    data.recordings
      .map((recording: Record<string, unknown>) => {
        const credits = Array.isArray(recording['artist-credit'])
          ? recording['artist-credit']
          : [];
        const artistNames = credits
          .map((credit: Record<string, unknown>) =>
            cleanText(
              typeof credit?.name === 'string'
                ? credit.name
                : (credit?.artist as Record<string, unknown> | undefined)?.name,
              160,
            ),
          )
          .filter(Boolean)
          .join(' & ');
        const releases = Array.isArray(recording.releases) ? recording.releases : [];
        return cleanSuggestion(
          recording.title,
          artistNames,
          (releases[0] as Record<string, unknown> | undefined)?.title,
        );
      })
      .filter((item): item is Suggestion => Boolean(item)),
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  const ip = clientIp(req);
  if (!allowRequest(ip)) {
    return json({ error: 'Too many lookups. Try again in a minute.' }, 429);
  }

  try {
    const body = await req.json().catch(() => null);
    const song = cleanText(body?.song);
    const artist = cleanText(body?.artist);
    if (!song && !artist) {
      return json({ error: 'Enter a song or an artist.' }, 400);
    }

    const key = normalizedKey(song, artist);
    const cached = readCache(key);
    if (cached) return json({ suggestions: cached });

    let suggestions: Suggestion[] = [];
    try {
      suggestions = await searchItunes(song, artist);
    } catch {
      suggestions = [];
    }

    if (suggestions.length === 0) {
      try {
        suggestions = await searchMusicBrainz(song, artist);
      } catch {
        suggestions = [];
      }
    }

    writeCache(key, suggestions);
    return json({ suggestions });
  } catch {
    // Advisory lookup: never turn an upstream problem into a blocking error.
    return json({ suggestions: [] });
  }
});
