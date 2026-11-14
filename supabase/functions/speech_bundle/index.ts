// Supabase Edge Function: speech_bundle
//
// Role-scoped speech projection and key delivery. No table access is granted to
// anon/authenticated; the service role reads and writes the bundle.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'npm:jose@5';
import { bytesToBase64Url, deriveSpeechKeyBytes } from '../_shared/speechSecrets.js';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN')?.trim() ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')?.trim() ?? '';
const JWKS = SUPABASE_URL
  ? createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`))
  : null;
const SPEAKER_ROLES = new Set(['speaker']);
const MC_ROLES = new Set(['mc', 'dj_mc']);
const SUMMARY_ROLES = new Set(['dj', 'photo1', 'photo2', 'video', 'venue_manager']);

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
  const value = Deno.env.get(name) ?? '';
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
}

async function verifyRoleToken(token: string) {
  const header = decodeProtectedHeader(token);
  if (header.alg !== 'ES256' || !JWKS) throw new Error('Invalid role token.');
  const { payload } = await jwtVerify(token, JWKS, { algorithms: ['ES256'] });
  return payload;
}

async function activeSession(admin: any, payload: any) {
  if (typeof payload?.jti !== 'string' || !payload.jti) return false;
  const { data } = await admin
    .from('role_sessions')
    .select('revoked_at, expires_at')
    .eq('jti', payload.jti)
    .maybeSingle();
  if (!data || data.revoked_at) return false;
  return !data.expires_at || Date.parse(data.expires_at) > Date.now();
}

function metadata(record: any) {
  return {
    id: record.id,
    order: record.sort_order,
    speaker: {
      name: record.speaker_name,
      relationship: record.speaker_relationship ?? null,
    },
    speakerLanguage: record.speaker_language,
    mcLanguage: record.mc_language,
    speakerAccess: record.speaker_access,
    status: record.status,
    revision: record.live_revision,
    lockedAt: record.locked_at,
  };
}

Deno.serve(async (req) => {
  if (!originAllowed(req)) return json({ error: 'Origin not allowed.' }, 403);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Sign in first.' }, 401);
    let payload;
    try {
      payload = await verifyRoleToken(token);
    } catch {
      return json({ error: 'Invalid role session.' }, 401);
    }

    const admin = createClient(serverEnv('SUPABASE_URL'), serverEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    if (!(await activeSession(admin, payload))) {
      return json({ error: 'This device session has been revoked or expired.' }, 401);
    }

    const body = await req.json().catch(() => null);
    const action = typeof body?.action === 'string' ? body.action : 'list';
    const weddingId = typeof payload.wedding_id === 'string' ? payload.wedding_id : '';
    const appRole = typeof payload.app_role === 'string' ? payload.app_role : '';
    if (!weddingId) return json({ error: 'Invalid role session.' }, 401);

    const { data: liveRow } = await admin
      .from('speech_live')
      .select('speech_id, started_at')
      .eq('wedding_id', weddingId)
      .maybeSingle();

    if (action === 'list') {
      if (!MC_ROLES.has(appRole) && !SPEAKER_ROLES.has(appRole) && !SUMMARY_ROLES.has(appRole)) {
        return json({ error: 'This role cannot read speeches.' }, 403);
      }
      const { data: records, error } = await admin
        .from('speech_records')
        .select('*')
        .eq('wedding_id', weddingId)
        .neq('status', 'DELETED')
        .order('sort_order', { ascending: true });
      if (error) throw error;

      const allowed =
        SPEAKER_ROLES.has(appRole)
          ? (records ?? []).filter((record: any) => record.id === payload.speech_id)
          : records ?? [];
      const revisions = allowed.filter((record: any) => record.live_revision != null);
      const { data: revisionRows } = revisions.length
        ? await admin
            .from('speech_revisions')
            .select('revision, entries, published_at')
            .eq('wedding_id', weddingId)
            .in('revision', revisions.map((record: any) => record.live_revision))
        : { data: [] };
      const byRevision = new Map(
        (revisionRows ?? []).map((row: any) => [row.revision, row]),
      );

      return json({
        mode: null,
        liveSpeechId: liveRow?.speech_id ?? null,
        speeches: allowed.map((record: any) => {
          const revision = record.live_revision
            ? byRevision.get(record.live_revision)
            : null;
          const entry = revision?.entries?.[record.id] ?? null;
          if (SUMMARY_ROLES.has(appRole) && !MC_ROLES.has(appRole)) {
            return metadata(record);
          }
          return {
            ...metadata(record),
            publishedAt: revision?.published_at ?? null,
            script: entry
              ? {
                  alg: entry.alg,
                  iv: entry.iv,
                  ciphertext: entry.ciphertext,
                  keyVersion: entry.keyVersion,
                }
              : null,
          };
        }),
      });
    }

    if (action === 'key') {
      const speechId = typeof body?.speechId === 'string' ? body.speechId.trim() : '';
      if (!speechId) return json({ error: 'A speechId is required.' }, 400);
      if (!MC_ROLES.has(appRole)) {
        if (!SPEAKER_ROLES.has(appRole) || payload.speech_id !== speechId) {
          return json({ error: 'Only the assigned speaker may unlock this speech.' }, 403);
        }
        const { data: access } = await admin
          .from('speech_access')
          .select('enabled, revoked_at')
          .eq('wedding_id', weddingId)
          .eq('speech_id', speechId)
          .maybeSingle();
        if (!access?.enabled || access.revoked_at) {
          return json({ error: 'Speech access is revoked.' }, 403);
        }
      }
      const { data: record } = await admin
        .from('speech_records')
        .select('id')
        .eq('wedding_id', weddingId)
        .eq('id', speechId)
        .maybeSingle();
      if (!record) return json({ error: 'Speech not found.' }, 404);
      const version = Number.isInteger(body?.keyVersion) ? body.keyVersion : 1;
      const key = await deriveSpeechKeyBytes(
        serverEnv('SPEECH_SECRET_MASTER_KEY'),
        weddingId,
        speechId,
        version,
      );
      return json({
        key: bytesToBase64Url(key),
        keyVersion: version,
        speechId,
        weddingId,
      });
    }

    if (action === 'start' || action === 'end') {
      if (!MC_ROLES.has(appRole)) return json({ error: 'Only the MC controls live speeches.' }, 403);
      const speechId = typeof body?.speechId === 'string' ? body.speechId.trim() : '';
      if (action === 'start' && !speechId) return json({ error: 'A speechId is required.' }, 400);

      if (action === 'start') {
        const { data: record } = await admin
          .from('speech_records')
          .select('id, live_revision, status')
          .eq('wedding_id', weddingId)
          .eq('id', speechId)
          .maybeSingle();
        if (!record || record.status !== 'PUBLISHED' || !record.live_revision) {
          return json({ error: 'Only a published speech can start.' }, 409);
        }
        await admin
          .from('speech_live')
          .upsert(
            { wedding_id: weddingId, speech_id: speechId, started_at: new Date().toISOString() },
            { onConflict: 'wedding_id' },
          );
      } else {
        await admin.from('speech_live').delete().eq('wedding_id', weddingId);
      }

      const { data: live } = await admin
        .from('live_sync_state')
        .select('state')
        .eq('wedding_id', `wzsd:${weddingId}`)
        .maybeSingle();
      await admin.from('live_sync_state').upsert(
        {
          wedding_id: `wzsd:${weddingId}`,
          state: {
            ...(live?.state ?? {}),
            active_speech_id: action === 'start' ? speechId : null,
          },
        },
        { onConflict: 'wedding_id' },
      );
      await admin.from('speech_logs').insert({
        wedding_id: weddingId,
        actor: appRole,
        action: `speech_${action}`,
        message: action === 'start' ? `Started ${speechId}` : 'Ended live speech',
      });
      return json({ ok: true, liveSpeechId: action === 'start' ? speechId : null });
    }

    return json({ error: 'Unknown speech action.' }, 400);
  } catch (error) {
    console.error('speech_bundle failed', error?.message ?? error);
    return json({ error: 'The speech bundle is unavailable.' }, 500);
  }
});
