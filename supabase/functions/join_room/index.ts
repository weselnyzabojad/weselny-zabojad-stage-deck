// Supabase Edge Function: join_room
//
// Validates a 6-digit per-role PIN against `public.wedding_roles.pin_hash`
// (bcrypt), rate-limits failures to 5 per room/role/IP / 15 minutes, and returns
// a short-lived role-scoped JWT.
//
// Deploy:
//   supabase functions deploy join_room
// Secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   DECK_SUPABASE_JWT_PRIVATE_KEY (ES256 private JWK; preferred),
//   DECK_SUPABASE_JWT_KEY_ID (the ES256 signing-key kid),
//   ALLOWED_ORIGIN (optional, default *)
//
// The JWT uses Supabase's reserved `role: "authenticated"` claim for PostgREST,
// and a separate `app_role` claim for the device role (mc/dj/photo/speaker).

import { createClient } from 'npm:@supabase/supabase-js@2';
import bcrypt from 'npm:bcryptjs@2.4.3';
import { SignJWT, importJWK } from 'npm:jose@5';

const ALLOWED_ROLES = new Set(['mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker']);
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const TOKEN_TTL_SECONDS = 24 * 60 * 60;

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN')?.trim() ?? '';

function originAllowed(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  return !origin || (ALLOWED_ORIGIN !== '' && origin === ALLOWED_ORIGIN);
}
const JWT_KEY_ID = Deno.env.get('DECK_SUPABASE_JWT_KEY_ID')?.trim() ?? '';

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
    const roomCode = typeof body?.roomCode === 'string' ? body.roomCode.trim() : '';
    const role = typeof body?.role === 'string' ? body.role.trim() : '';
    const pin = typeof body?.pin === 'string' ? body.pin.trim() : '';
    const deviceId =
      typeof body?.deviceId === 'string' && body.deviceId.trim()
        ? body.deviceId.trim().slice(0, 120)
        : 'unknown';
    const deviceLabel =
      typeof body?.deviceLabel === 'string' && body.deviceLabel.trim()
        ? body.deviceLabel.trim().slice(0, 120)
        : deviceId;

    if (!roomCode || !ALLOWED_ROLES.has(role) || !/^\d{6}$/.test(pin)) {
      return json({ error: 'Enter the room code and the 6-digit PIN for this role.' }, 400);
    }

    const admin = createClient(serverEnv('SUPABASE_URL'), serverEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const ipHash = await sha256Hex(clientIp(req));
    const since = new Date(Date.now() - WINDOW_MS).toISOString();

    const { count, error: rateError } = await admin
      .from('join_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('room_code', roomCode)
      .eq('role', role)
      .eq('ip_hash', ipHash)
      .eq('success', false)
      .gte('attempted_at', since);

    if (rateError) throw rateError;
    if ((count ?? 0) >= MAX_FAILURES) {
      return json({ error: 'Too many failed attempts. This role is locked for 15 minutes.' }, 429);
    }

    const { data: wedding, error: weddingError } = await admin
      .from('weddings')
      .select('wedding_id, room_code, expires_at, archived_at')
      .eq('room_code', roomCode)
      .maybeSingle();

    if (weddingError) throw weddingError;
    if (!wedding) {
      return json({ error: 'Room not found. Check the share link.' }, 404);
    }
    if (wedding.archived_at) {
      return json({ error: 'This room has been archived. Ask the owner for access.' }, 410);
    }
    if (wedding.expires_at && Date.parse(wedding.expires_at) < Date.now()) {
      return json({ error: 'This room has ended. Ask the MC for a new share link.' }, 410);
    }

    const { data: roleRow, error: roleError } = await admin
      .from('wedding_roles')
      .select('pin_hash')
      .eq('wedding_id', wedding.wedding_id)
      .eq('role', role)
      .maybeSingle();

    if (roleError) throw roleError;

    const validPin = Boolean(roleRow?.pin_hash) && bcrypt.compareSync(pin, roleRow.pin_hash);

    if (!validPin) {
      await admin.from('join_attempts').insert({
        room_code: roomCode,
        role,
        ip_hash: ipHash,
        success: false,
      });
      return json({ error: 'Incorrect PIN for this role.' }, 401);
    }

    // Successful join clears the failure window for this device/role.
    await admin
      .from('join_attempts')
      .delete()
      .eq('room_code', roomCode)
      .eq('role', role)
      .eq('ip_hash', ipHash)
      .eq('success', false);

    const roomId = `wzsd:${wedding.wedding_id}`;
    const expiry = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(expiry * 1000).toISOString();

    // Register this device session so the owner can audit and revoke it.
    // The RLS policies check `current_session_active()` on every room request.
    const { error: sessionError } = await admin.from('role_sessions').insert({
      jti: sessionId,
      wedding_id: wedding.wedding_id,
      role,
      device_id: deviceId,
      device_label: deviceLabel,
      issued_at: new Date().toISOString(),
      expires_at: expiresAt,
    });
    if (sessionError) throw sessionError;

    await admin.from('role_presence').upsert(
      {
        wedding_id: wedding.wedding_id,
        role,
        device_id: deviceId,
        session_jti: sessionId,
        device_label: deviceLabel,
        status: 'online',
        current_view: role,
        last_seen: new Date().toISOString(),
        token_expires_at: expiresAt,
      },
      { onConflict: 'wedding_id,role,device_id' },
    );

    // ES256 is the only accepted signing path; the HS256 shared secret was
    // removed after the rotation window (#853). Fail closed when the key is
    // missing instead of falling back to a shared secret.
    const jwk = JSON.parse(serverEnv('DECK_SUPABASE_JWT_PRIVATE_KEY'));
    // `key_ops` from `supabase gen signing-key` includes verify; WebCrypto
    // rejects that for a private signing key, so let jose derive the usage.
    delete jwk.key_ops;
    delete jwk.use;
    const signingKey = await importJWK(jwk, 'ES256');
    const signingAlg = 'ES256';

    const token = await new SignJWT({
      // Reserved Supabase/PostgREST claim: the Postgres role, not the device role.
      role: 'authenticated',
      wedding_id: wedding.wedding_id,
      room_id: roomId,
      app_role: role,
    })
      .setProtectedHeader({
        alg: signingAlg,
        typ: 'JWT',
        ...(JWT_KEY_ID ? { kid: JWT_KEY_ID } : {}),
      })
      .setSubject(wedding.wedding_id)
      .setAudience('authenticated')
      .setIssuer('supabase')
      .setIssuedAt()
      .setJti(sessionId)
      .setExpirationTime(expiry)
      .sign(signingKey);

    return json({
      token,
      sessionId,
      weddingId: wedding.wedding_id,
      roomId,
      role,
      deviceId,
      expiresAt,
    });
  } catch (error) {
    console.error('join_room failed', error);
    return json({ error: 'Could not join the room. Try again shortly.' }, 500);
  }
});
