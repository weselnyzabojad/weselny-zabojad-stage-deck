// Supabase Edge Function: submit_song_request
//
// Public, room-scoped guest request intake. Guests submit a song, an artist and
// a persistent device correlation id. The function validates input, rate-limits
// by hashed IP/room as an abuse backstop, enforces a 10-minute per-device
// cooldown, checks that the room is live, and inserts a pending request with the
// service role. It returns the request id so the guest view can follow status.
// Guests can never read the queue or wedding data.
//
// Deploy:
//   supabase functions deploy submit_song_request
// Secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ALLOWED_ORIGIN (optional)

import { createClient } from 'npm:@supabase/supabase-js@2';
import { songRequestEligible, SONG_REQUESTS_UNAVAILABLE } from '../_shared/songRequestEligibility.js';

const ROOM_CODE_PATTERN = /^[a-z0-9]{6,12}$/;
const DEVICE_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
const MAX_LENGTH = 120;
const MAX_IP_ATTEMPTS = 8;
const MAX_ROOM_ATTEMPTS = 120;
const WINDOW_MS = 10 * 60 * 1000;
const DEVICE_COOLDOWN_MS = 10 * 60 * 1000;

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN')?.trim() ?? '';

function originAllowed(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  return !origin || (ALLOWED_ORIGIN !== '' && origin === ALLOWED_ORIGIN);
}

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
  if (!originAllowed(req)) {
    return json({ error: 'Origin not allowed.' }, 403);
  }
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
    const deviceId = typeof body?.device_id === 'string' ? body.device_id.trim() : '';

    if (!ROOM_CODE_PATTERN.test(roomCode) || !song || !artist) {
      return json({ code: 'invalid_input', error: 'Enter both the song and the artist.' }, 400);
    }
    if (!DEVICE_ID_PATTERN.test(deviceId)) {
      return json({ code: 'invalid_device', error: 'This device could not be identified.' }, 400);
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
      return json(
        { code: 'rate_limited', error: 'Too many requests. Please wait a few minutes and try again.' },
        429,
      );
    }

    // Count every well-formed attempt, including invalid/expired room codes, so
    // the public endpoint cannot be used to probe or flood the service.
    await admin.from('song_request_attempts').insert({ room_code: roomCode, ip_hash: ipHash });

    const { data: wedding, error: weddingError } = await admin
      .from('weddings')
      .select('wedding_id, expires_at, archived_at, cartridge')
      .eq('room_code', roomCode)
      .maybeSingle();

    if (weddingError) throw weddingError;
    if (!wedding) {
      return json({ code: 'inactive_room', error: 'This request link is no longer active.' }, 404);
    }
    if (wedding.archived_at) {
      return json({ code: 'inactive_room', error: 'This request link is no longer active.' }, 410);
    }
    if (wedding.expires_at && Date.parse(wedding.expires_at) < Date.now()) {
      return json({ code: 'inactive_room', error: 'This request link is no longer active.' }, 410);
    }
    if (!songRequestEligible(wedding.cartridge)) {
      return json(
        {
          code: SONG_REQUESTS_UNAVAILABLE,
          error: 'Song requests are not available for this wedding.',
        },
        403,
      );
    }

    const { data: recent, error: cooldownError } = await admin
      .from('song_requests')
      .select('created_at')
      .eq('wedding_id', wedding.wedding_id)
      .eq('device_id', deviceId)
      .gte('created_at', new Date(Date.now() - DEVICE_COOLDOWN_MS).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cooldownError) throw cooldownError;
    if (recent?.created_at) {
      const elapsedMs = Date.now() - Date.parse(recent.created_at);
      const retryAfterSeconds = Math.max(1, Math.ceil((DEVICE_COOLDOWN_MS - elapsedMs) / 1000));
      return json(
        {
          code: 'cooldown',
          retryAfterSeconds,
          retryAfterMinutes: Math.ceil(retryAfterSeconds / 60),
          error: 'Please wait before sending another request.',
        },
        429,
      );
    }

    const { data: inserted, error: insertError } = await admin
      .from('song_requests')
      .insert({
        wedding_id: wedding.wedding_id,
        song,
        artist,
        status: 'pending',
        source: 'guest_qr',
        device_id: deviceId,
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    return json({ received: true, requestId: inserted.id }, 202);
  } catch (error) {
    console.error('submit_song_request failed', error);
    return json({ error: 'The request could not be sent. Try again shortly.' }, 500);
  }
});
