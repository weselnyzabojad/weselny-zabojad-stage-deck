// Supabase Edge Function: publish_room (admin only)
//
// Creates/updates a wedding room and rotates its 6-digit per-role PINs. The PINs
// are returned once in the response; only bcrypt hashes are stored.
//
// Deploy:
//   supabase functions deploy publish_room
// Secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DECK_PUBLISH_SECRET
//   PUBLIC_DECK_URL (default https://www.weselnyzabojad.pl/deck)
//
// Call from the MC admin page with the `x-publish-secret` header. Never call this
// from the public deck bundle.

import { createClient } from 'npm:@supabase/supabase-js@2';
import bcrypt from 'npm:bcryptjs@2.4.3';

const ALLOWED_ROLES = ['mc', 'dj', 'photo', 'speaker'];
const DEFAULT_ROLES = ['mc', 'dj'];
const ROOM_CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const WEDDING_ID_PATTERN = /^\d{4}-\d{2}-\d{2}_[a-z0-9_]+$/;
const ROOM_CODE_PATTERN = /^[a-z0-9]{6,12}$/;

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-publish-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders() });
}

function serverEnv(name: string, fallback = '') {
  return Deno.env.get(name) ?? fallback;
}

function randomRoomCode(length = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]).join('');
}

function randomPin() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 900000;
  return String(100000 + value);
}

// D4: never store plaintext VIP alerts or contacts in the published cartridge.
// The MC device uploads the encrypted bundle separately to `sensitive_notes`.
function redactSensitive(cartridge: Record<string, unknown>) {
  const copy = { ...cartridge };
  delete copy.vipAlerts;
  delete copy.tact_and_vip_alerts;
  delete copy.contacts;
  return copy;
}

function parseEventDateISO(body: any, cartridge: Record<string, any>, fallbackDate: string | null, weddingId: string) {
  if (typeof cartridge.dateISO === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cartridge.dateISO)) {
    return cartridge.dateISO;
  }
  const display = typeof cartridge.date === 'string' ? cartridge.date : fallbackDate;
  const match = /^([0-3]\d)\.([01]\d)\.(\d{4})$/.exec(display ?? '');
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;

  const fromId = /^(\d{4}-\d{2}-\d{2})/.exec(weddingId);
  return fromId?.[1] ?? null;
}

// TTL runs from the event, not from publish time: `expiresInDays` is the grace
// period after the wedding (default 7). Without an event date, fall back to 30
// days from now. Never let the room die before the event.
function resolveExpiresAt(body: any, cartridge: Record<string, any>, date: string | null, weddingId: string) {
  const requested = Number.isFinite(body?.expiresInDays) ? Math.round(body.expiresInDays) : null;
  const eventDateISO = parseEventDateISO(body, cartridge, date, weddingId);
  const days = Math.min(365, Math.max(1, requested ?? (eventDateISO ? 7 : 30)));
  const baseMs = eventDateISO ? Date.parse(`${eventDateISO}T23:59:59Z`) : Date.now();
  return new Date(baseMs + days * 86400000).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  const expectedSecret = serverEnv('DECK_PUBLISH_SECRET');
  if (!expectedSecret) {
    return json({ error: 'Publishing is not configured on this deployment.' }, 503);
  }
  if (req.headers.get('x-publish-secret') !== expectedSecret) {
    return json({ error: 'Not authorized.' }, 401);
  }

  try {
    const body = await req.json().catch(() => null);
    const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
    const couple = typeof body?.couple === 'string' ? body.couple.trim() : null;
    const date = typeof body?.date === 'string' ? body.date.trim() : null;
    const cartridge = body?.cartridge && typeof body.cartridge === 'object' ? body.cartridge : null;
    const requestedRoles = Array.isArray(body?.roles) ? body.roles : DEFAULT_ROLES;
    const roles = [...new Set(requestedRoles)].filter((role) => ALLOWED_ROLES.includes(role));

    if (!WEDDING_ID_PATTERN.test(weddingId)) {
      return json({ error: 'weddingId must look like YYYY-MM-DD_bride_groom.' }, 400);
    }
    if (!cartridge) {
      return json({ error: 'A cartridge object is required.' }, 400);
    }
    if (roles.length === 0) {
      return json({ error: 'Provide at least one role.' }, 400);
    }

    const requestedRoomCode =
      typeof body?.roomCode === 'string' ? body.roomCode.trim().toLowerCase() : '';
    if (requestedRoomCode && !ROOM_CODE_PATTERN.test(requestedRoomCode)) {
      return json({ error: 'roomCode must be 6–12 lowercase letters/digits.' }, 400);
    }

    const admin = createClient(serverEnv('SUPABASE_URL'), serverEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Re-publishing rotates the PINs but keeps the share link stable unless a
    // new room code is explicitly requested.
    const { data: existing } = await admin
      .from('weddings')
      .select('room_code')
      .eq('wedding_id', weddingId)
      .maybeSingle();
    const roomCode = requestedRoomCode || existing?.room_code || randomRoomCode();

    const { error: weddingError } = await admin.from('weddings').upsert(
      {
        wedding_id: weddingId,
        room_code: roomCode,
        couple,
        date,
        cartridge: redactSensitive(cartridge),
        expires_at: resolveExpiresAt(body, cartridge, date, weddingId),
      },
      { onConflict: 'wedding_id' },
    );
    if (weddingError) throw weddingError;

    const pins: Record<string, string> = {};
    const roleRows = roles.map((role) => {
      const pin = randomPin();
      pins[role] = pin;
      return {
        wedding_id: weddingId,
        role,
        pin_hash: bcrypt.hashSync(pin, 10),
      };
    });

    const { error: roleError } = await admin
      .from('wedding_roles')
      .upsert(roleRows, { onConflict: 'wedding_id,role' });
    if (roleError) throw roleError;

    // Seed the room state once; the MC's first publish owns it afterwards.
    await admin.from('live_sync_state').upsert(
      {
        wedding_id: `wzsd:${weddingId}`,
        state: cartridge.liveSyncState ?? {},
      },
      { onConflict: 'wedding_id', ignoreDuplicates: true },
    );

    const base = serverEnv('PUBLIC_DECK_URL', 'https://www.weselnyzabojad.pl/deck').replace(/\/+$/, '');
    const links = Object.fromEntries(
      roles.map((role) => [role, `${base}/${roomCode}/${role}`]),
    );

    return json({
      weddingId,
      roomCode,
      roles: pins,
      links,
      note: 'PINs are shown once and stored only as hashes. Re-publishing rotates them.',
    });
  } catch (error) {
    console.error('publish_room failed', error);
    return json({ error: 'Could not publish the room.' }, 500);
  }
});
