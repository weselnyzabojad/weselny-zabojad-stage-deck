// Supabase Edge Function: admin_api (owner only)
//
// Every request carries a Supabase Auth access token. The owner must be in
// `public.app_admins` and the session must be aal2 (verified TOTP MFA).
// Destructive actions additionally require a TOTP re-auth within 5 minutes
// (`amr` claim), matching the `/deck/admin` UI.
//
// Deploy:
//   supabase functions deploy admin_api
// Secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PUBLIC_DECK_URL, ALLOWED_ORIGIN

import { createClient } from 'npm:@supabase/supabase-js@2';
import bcrypt from 'npm:bcryptjs@2.4.3';

const ALLOWED_ROLES = ['mc', 'dj', 'photo', 'speaker'];
const DEFAULT_ROLES = ['mc', 'dj'];
const ROOM_CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const WEDDING_ID_PATTERN = /^\d{4}-\d{2}-\d{2}_[a-z0-9_]+$/;
const ROOM_CODE_PATTERN = /^[a-z0-9]{6,12}$/;
const MFA_REAUTH_WINDOW_SECONDS = 5 * 60;
const DESTRUCTIVE_ACTIONS = new Set(['archive', 'delete', 'rotate_pins', 'revoke_session']);

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

function serverEnv(name: string, fallback = '') {
  const value = Deno.env.get(name) ?? fallback;
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
}

function decodeJwt(token: string) {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replaceAll('-', '+').replaceAll('_', '/');
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}

function mfaFresh(claims: any, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!claims || claims.aal !== 'aal2') return false;
  const amr = Array.isArray(claims.amr) ? claims.amr : [];
  const latest = amr
    .filter((entry: any) => entry?.method === 'totp' && Number.isFinite(Number(entry?.timestamp)))
    .map((entry: any) => Number(entry.timestamp))
    .sort((a: number, b: number) => a - b)
    .at(-1);
  return Boolean(latest && nowSeconds - latest <= MFA_REAUTH_WINDOW_SECONDS);
}

function randomRoomCode(length = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]).join('');
}

function randomPin() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 900000;
  return String(100000 + value);
}

function pinFor(role: string, requestedPins: Record<string, unknown> | null | undefined) {
  const requested = requestedPins?.[role];
  return typeof requested === 'string' && /^\d{6}$/.test(requested) ? requested : randomPin();
}

function normalizeRoles(value: unknown) {
  const requested = Array.isArray(value) && value.length > 0 ? value : DEFAULT_ROLES;
  return [...new Set(requested)].filter((role) => ALLOWED_ROLES.includes(role as string)) as string[];
}

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

function resolveExpiresAt(body: any, cartridge: Record<string, any>, date: string | null, weddingId: string) {
  const requested = Number.isFinite(body?.expiresInDays) ? Math.round(body.expiresInDays) : null;
  const eventDateISO = parseEventDateISO(body, cartridge, date, weddingId);
  const days = Math.min(365, Math.max(1, requested ?? (eventDateISO ? 7 : 30)));
  const baseMs = eventDateISO ? Date.parse(`${eventDateISO}T23:59:59Z`) : Date.now();
  return new Date(baseMs + days * 86400000).toISOString();
}

async function writeAudit(admin: any, actor: any, action: string, target: string | null, detail: unknown) {
  await admin.from('admin_audit_log').insert({
    actor_id: actor.user_id ?? actor.id,
    actor_email: actor.email,
    action,
    target,
    detail: detail ?? null,
  });
}

async function publishWedding(admin: any, body: any) {
  const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
  const couple = typeof body?.couple === 'string' ? body.couple.trim() : null;
  const date = typeof body?.date === 'string' ? body.date.trim() : null;
  const cartridge = body?.cartridge && typeof body.cartridge === 'object' ? body.cartridge : null;
  const roles = normalizeRoles(body?.roles);

  if (!WEDDING_ID_PATTERN.test(weddingId)) {
    return { error: 'weddingId must look like YYYY-MM-DD_bride_groom.', status: 400 };
  }
  if (!cartridge) return { error: 'A cartridge object is required.', status: 400 };
  if (roles.length === 0) return { error: 'Provide at least one role.', status: 400 };

  const requestedRoomCode =
    typeof body?.roomCode === 'string' ? body.roomCode.trim().toLowerCase() : '';
  if (requestedRoomCode && !ROOM_CODE_PATTERN.test(requestedRoomCode)) {
    return { error: 'roomCode must be 6–12 lowercase letters/digits.', status: 400 };
  }

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
      archived_at: null,
      expires_at: resolveExpiresAt(body, cartridge, date, weddingId),
    },
    { onConflict: 'wedding_id' },
  );
  if (weddingError) throw weddingError;

  const requestedPins = body?.pins && typeof body.pins === 'object' ? body.pins : null;
  const pins: Record<string, string> = {};
  const roleRows = roles.map((role) => {
    const pin = pinFor(role, requestedPins);
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

  await admin.from('live_sync_state').upsert(
    {
      wedding_id: `wzsd:${weddingId}`,
      state: cartridge.liveSyncState ?? {},
    },
    { onConflict: 'wedding_id', ignoreDuplicates: true },
  );

  return { weddingId, roomCode, roles: pins };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Sign in first.' }, 401);

    const admin = createClient(serverEnv('SUPABASE_URL'), serverEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: 'Invalid admin session.' }, 401);

    const { data: allowlisted } = await admin
      .from('app_admins')
      .select('user_id, email')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (!allowlisted) return json({ error: 'Not an allowlisted owner account.' }, 403);

    const claims = decodeJwt(token);
    if (claims?.aal !== 'aal2') {
      return json({ error: 'TOTP MFA required.', requiresMfa: true }, 403);
    }

    const body = await req.json().catch(() => null);
    const action = typeof body?.action === 'string' ? body.action : '';

    if (DESTRUCTIVE_ACTIONS.has(action) && !mfaFresh(claims)) {
      return json(
        { error: 'Re-authenticate with your TOTP code before this action.', requiresMfaReauth: true },
        403,
      );
    }

    if (action === 'list') {
      const [weddings, roles, sessions, presence, audit] = await Promise.all([
        admin
          .from('weddings')
          .select('wedding_id, room_code, couple, date, expires_at, archived_at, created_at, updated_at, cartridge')
          .order('updated_at', { ascending: false }),
        admin.from('wedding_roles').select('wedding_id, role, updated_at'),
        admin
          .from('role_sessions')
          .select('jti, wedding_id, role, device_id, device_label, issued_at, expires_at, revoked_at')
          .order('issued_at', { ascending: false })
          .limit(250),
        admin.from('role_presence').select('*').order('last_seen', { ascending: false }).limit(250),
        admin
          .from('admin_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);
      const firstError =
        weddings.error || roles.error || sessions.error || presence.error || audit.error;
      if (firstError) throw firstError;

      const rolesByWedding: Record<string, string[]> = {};
      for (const row of roles.data ?? []) {
        rolesByWedding[row.wedding_id] ??= [];
        rolesByWedding[row.wedding_id].push(row.role);
      }

      return json({
        weddings: (weddings.data ?? []).map((row: any) => {
          const venue =
            typeof row.cartridge?.venue === 'string'
              ? row.cartridge.venue
              : row.cartridge?.venue?.name ?? '';
          const { cartridge: _cartridge, ...summary } = row;
          return {
            ...summary,
            venue,
            roles: (rolesByWedding[row.wedding_id] ?? []).sort(),
          };
        }),
        sessions: sessions.data ?? [],
        presence: presence.data ?? [],
        audit: audit.data ?? [],
        publicDeckUrl: serverEnv('PUBLIC_DECK_URL', 'https://www.weselnyzabojad.pl/deck'),
      });
    }

    if (action === 'publish') {
      const result = await publishWedding(admin, body);
      if ('error' in result) return json({ error: result.error }, result.status);
      await writeAudit(admin, allowlisted, 'publish', result.weddingId, {
        roomCode: result.roomCode,
        roles: Object.keys(result.roles),
      });
      return json(result);
    }

    if (action === 'duplicate') {
      const sourceId = typeof body?.sourceWeddingId === 'string' ? body.sourceWeddingId.trim() : '';
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) {
        return json({ error: 'New weddingId must look like YYYY-MM-DD_bride_groom.' }, 400);
      }
      const { data: source, error: sourceError } = await admin
        .from('weddings')
        .select('couple, date, cartridge')
        .eq('wedding_id', sourceId)
        .maybeSingle();
      if (sourceError) throw sourceError;
      if (!source?.cartridge) return json({ error: 'Source wedding not found.' }, 404);

      const result = await publishWedding(admin, {
        weddingId,
        couple: body?.couple ?? source.couple,
        date: body?.date ?? source.date,
        roomCode: body?.roomCode,
        roles: body?.roles ?? normalizeRoles(body?.roles),
        cartridge: source.cartridge,
      });
      if ('error' in result) return json({ error: result.error }, result.status);
      await writeAudit(admin, allowlisted, 'duplicate', weddingId, { sourceId });
      return json(result);
    }

    if (action === 'archive') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      const { error } = await admin
        .from('weddings')
        .update({ archived_at: new Date().toISOString() })
        .eq('wedding_id', weddingId);
      if (error) throw error;
      await writeAudit(admin, allowlisted, 'archive', weddingId, null);
      return json({ ok: true });
    }

    if (action === 'delete') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      const { error } = await admin.from('weddings').delete().eq('wedding_id', weddingId);
      if (error) throw error;
      await writeAudit(admin, allowlisted, 'delete', weddingId, null);
      return json({ ok: true });
    }

    if (action === 'rotate_pins') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const roles = normalizeRoles(body?.roles);
      if (!WEDDING_ID_PATTERN.test(weddingId)) return json({ error: 'Invalid weddingId.' }, 400);
      if (roles.length === 0) return json({ error: 'Provide at least one role.' }, 400);

      const requestedPins = body?.pins && typeof body.pins === 'object' ? body.pins : null;
      const pins: Record<string, string> = {};
      const rows = roles.map((role) => {
        const pin = pinFor(role, requestedPins);
        pins[role] = pin;
        return { wedding_id: weddingId, role, pin_hash: bcrypt.hashSync(pin, 10) };
      });
      const { error } = await admin
        .from('wedding_roles')
        .upsert(rows, { onConflict: 'wedding_id,role' });
      if (error) throw error;
      await writeAudit(admin, allowlisted, 'rotate_pins', weddingId, { roles });
      return json({ weddingId, roles: pins });
    }

    if (action === 'revoke_session') {
      const jti = typeof body?.jti === 'string' ? body.jti.trim() : '';
      if (!jti) return json({ error: 'Session id required.' }, 400);
      const { data: session, error: readError } = await admin
        .from('role_sessions')
        .select('jti, wedding_id, role, device_id')
        .eq('jti', jti)
        .maybeSingle();
      if (readError) throw readError;
      if (!session) return json({ error: 'Session not found.' }, 404);

      const { error } = await admin
        .from('role_sessions')
        .update({ revoked_at: new Date().toISOString(), revoked_by: allowlisted.user_id })
        .eq('jti', jti);
      if (error) throw error;

      await admin
        .from('role_presence')
        .update({ status: 'offline', session_jti: null, last_seen: new Date().toISOString() })
        .eq('wedding_id', session.wedding_id)
        .eq('role', session.role)
        .eq('device_id', session.device_id);

      await writeAudit(admin, allowlisted, 'revoke_session', session.wedding_id, {
        jti,
        role: session.role,
        deviceId: session.device_id,
      });
      return json({ ok: true });
    }

    return json({ error: 'Unknown admin action.' }, 400);
  } catch (error) {
    console.error('admin_api failed', error);
    return json({ error: 'Admin request failed. Try again shortly.' }, 500);
  }
});
