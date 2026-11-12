// Supabase Edge Function: get_song_request_status
//
// Guest-scoped status lookup. The guest proves only possession of the request
// id + persistent device id, so the function returns that single request and
// never exposes the queue, other devices or wedding data. Guests still have no
// table access; this endpoint runs with the service role.
//
// Deploy:
//   supabase functions deploy get_song_request_status
// Secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ALLOWED_ORIGIN (optional)

import { createClient } from 'npm:@supabase/supabase-js@2';

const ROOM_CODE_PATTERN = /^[a-z0-9]{6,12}$/;
const DEVICE_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
const REQUEST_ID_PATTERN = /^[0-9a-f-]{36}$/i;

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
    const requestId = typeof body?.requestId === 'string' ? body.requestId.trim() : '';
    const deviceId = typeof body?.device_id === 'string' ? body.device_id.trim() : '';

    if (
      !ROOM_CODE_PATTERN.test(roomCode) ||
      !REQUEST_ID_PATTERN.test(requestId) ||
      !DEVICE_ID_PATTERN.test(deviceId)
    ) {
      return json({ error: 'The request status is unavailable.' }, 400);
    }

    const admin = createClient(serverEnv('SUPABASE_URL'), serverEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: wedding, error: weddingError } = await admin
      .from('weddings')
      .select('wedding_id, expires_at, archived_at')
      .eq('room_code', roomCode)
      .maybeSingle();

    if (weddingError) throw weddingError;
    if (
      !wedding ||
      wedding.archived_at ||
      (wedding.expires_at && Date.parse(wedding.expires_at) < Date.now())
    ) {
      return json({ error: 'This request link is no longer active.' }, 404);
    }

    const { data: request, error: requestError } = await admin
      .from('song_requests')
      .select('id, song, artist, status, played_at')
      .eq('id', requestId)
      .eq('wedding_id', wedding.wedding_id)
      .eq('device_id', deviceId)
      .maybeSingle();

    if (requestError) throw requestError;
    if (!request) {
      return json({ error: 'The request status is unavailable.' }, 404);
    }

    return json({
      request: {
        id: request.id,
        song: request.song,
        artist: request.artist,
        status: request.status,
        played_at: request.played_at,
      },
    });
  } catch (error) {
    console.error('get_song_request_status failed', error);
    return json({ error: 'The request status is unavailable.' }, 500);
  }
});
