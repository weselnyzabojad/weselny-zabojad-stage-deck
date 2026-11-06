// Supabase Edge Function: submit_song_request
//
// Public, room-scoped guest request intake. Guests submit only a song and an
// artist. The function validates input, rate-limits by hashed IP and room, checks
// that the room is live, inserts a pending request with the service role, and
// returns only `{ received: true }`. Guests can never read the queue or wedding
// data.
//
// Deploy:
//   supabase functions deploy submit_song_request
// Secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ALLOWED_ORIGIN (optional)

import { createClient } from 'npm:@supabase/supabase-js@2';

const ROOM_CODE_PATTERN = /^[a-z0-9]{6,12}$/;
const MAX_LENGTH = 120;
const MAX_IP_ATTEMPTS = 8;
const MAX_ROOM_ATTEMPTS = 120;
const WINDOW_MS = 10 * 60 * 1000;

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*';

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

function serverEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
}

function clientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for') ?? '';
  return forwarded.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function cleanField(value: unknown) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > MAX_LENGTH) return null;
  const hasControlChars = [...text].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
  return hasControlChars ? null : text;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  try {
    const body = await req.json().catch(() => null);
    const roomCode =
      typeof body?.roomCode === 'string' ? body.roomCode.trim().toLowerCase() : '';
    const song = cleanField(body?.song);
    const artist = cleanField(body?.artist);

    if (!ROOM_CODE_PATTERN.test(roomCode) || !song || !artist) {
      return json({ error: 'Enter both the song and the artist.' }, 400);
    }

    const admin = createClient(serverEnv('SUPABASE_URL'), serverEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const ipHash = await sha256Hex(clientIp(req));
    const since = new Date(Date.now() - WINDOW_MS).toISOString();

    const [{ count: ipCount, error: ipError }, { count: roomCount, error: roomError }] =
      await Promise.all([
        admin
          .from('song_request_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('room_code', roomCode)
          .eq('ip_hash', ipHash)
          .gte('attempted_at', since),
        admin
          .from('song_request_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('room_code', roomCode)
          .gte('attempted_at', since),
      ]);

    if (ipError) throw ipError;
    if (roomError) throw roomError;
    if ((ipCount ?? 0) >= MAX_IP_ATTEMPTS || (roomCount ?? 0) >= MAX_ROOM_ATTEMPTS) {
      return json({ error: 'Too many requests. Please wait a few minutes and try again.' }, 429);
    }

    // Count every well-formed attempt, including invalid/expired room codes, so
    // the public endpoint cannot be used to probe or flood the service.
    await admin.from('song_request_attempts').insert({ room_code: roomCode, ip_hash: ipHash });

    const { data: wedding, error: weddingError } = await admin
      .from('weddings')
      .select('wedding_id, expires_at, archived_at')
      .eq('room_code', roomCode)
      .maybeSingle();

    if (weddingError) throw weddingError;
    if (!wedding) {
      return json({ error: 'This request link is no longer active.' }, 404);
    }
    if (wedding.archived_at) {
      return json({ error: 'This request link is no longer active.' }, 410);
    }
    if (wedding.expires_at && Date.parse(wedding.expires_at) < Date.now()) {
      return json({ error: 'This request link is no longer active.' }, 410);
    }

    const { error: insertError } = await admin.from('song_requests').insert({
      wedding_id: wedding.wedding_id,
      song,
      artist,
      status: 'pending',
      source: 'guest_qr',
    });

    if (insertError) throw insertError;

    return json({ received: true }, 202);
  } catch (error) {
    console.error('submit_song_request failed', error);
    return json({ error: 'The request could not be sent. Try again shortly.' }, 500);
  }
});
