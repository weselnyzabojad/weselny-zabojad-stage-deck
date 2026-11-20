// Supabase Edge Function: game_bundle (issue #931)
//
// MC-only projection of the encrypted game question bundles and their keys.
// The ciphertext is decrypted locally by the MC; no other role receives the
// bundle or a key. Service role only: anon/authenticated have no table access.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'npm:jose@5';
import { bytesToBase64Url } from '../_shared/bundleCrypto.js';
import { deriveGameKeyBytes } from '../_shared/gameBundle.js';
import { normalizeGameType } from '../_shared/gameQuestions.js';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN')?.trim() ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')?.trim() ?? '';
const JWKS = SUPABASE_URL
  ? createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`))
  : null;
const MC_ROLES = new Set(['mc', 'dj_mc']);

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

function metadata(row: any, revision: any) {
  return {
    gameType: row.game_type,
    gameId: row.game_id,
    title: row.title,
    sourceDocId: row.source_doc_id ?? null,
    status: row.status,
    revision: row.live_revision,
    questionCount: row.question_count,
    publishedAt: revision?.published_at ?? null,
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

    const appRole = typeof payload.app_role === 'string' ? payload.app_role : '';
    if (!MC_ROLES.has(appRole)) {
      return json({ error: 'Only the MC can read game questions.' }, 403);
    }

    const admin = createClient(serverEnv('SUPABASE_URL'), serverEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    if (!(await activeSession(admin, payload))) {
      return json({ error: 'This device session has been revoked or expired.' }, 401);
    }

    const weddingId = typeof payload.wedding_id === 'string' ? payload.wedding_id : '';
    if (!weddingId) return json({ error: 'Invalid role session.' }, 401);

    const body = await req.json().catch(() => null);
    const action = typeof body?.action === 'string' ? body.action : 'list';

    if (action === 'list') {
      const { data: bundles, error } = await admin
        .from('game_question_bundles')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('status', 'PUBLISHED')
        .not('live_revision', 'is', null)
        .order('game_type', { ascending: true });
      if (error) throw error;

      const rows = bundles ?? [];
      const { data: revisions } = rows.length
        ? await admin
            .from('game_question_revisions')
            .select('game_type, revision, published_at, entry')
            .eq('wedding_id', weddingId)
            .in('game_type', rows.map((row: any) => row.game_type))
        : { data: [] };
      const byRevision = new Map(
        (revisions ?? []).map((row: any) => [`${row.game_type}:${row.revision}`, row]),
      );

      return json({
        games: rows.map((row: any) => {
          const revision = byRevision.get(`${row.game_type}:${row.live_revision}`);
          const entry = revision?.entry ?? null;
          return {
            ...metadata(row, revision),
            bundle: entry
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
      const gameType = normalizeGameType(body?.gameType);
      if (!gameType) return json({ error: 'A valid gameType is required.' }, 400);

      const { data: bundle } = await admin
        .from('game_question_bundles')
        .select('game_type, game_id, live_revision, status')
        .eq('wedding_id', weddingId)
        .eq('game_type', gameType)
        .maybeSingle();
      if (!bundle || bundle.status !== 'PUBLISHED' || !bundle.live_revision) {
        return json({ error: 'Game questions are unavailable.' }, 404);
      }

      const version = Number.isInteger(body?.keyVersion) ? body.keyVersion : 1;
      const key = await deriveGameKeyBytes({
        masterKey: serverEnv('SPEECH_SECRET_MASTER_KEY'),
        weddingId,
        gameType,
        version,
      });
      return json({
        key: bytesToBase64Url(key),
        keyVersion: version,
        gameType,
        gameId: bundle.game_id,
        revision: bundle.live_revision,
        weddingId,
      });
    }

    return json({ error: 'Unknown game bundle action.' }, 400);
  } catch (error) {
    console.error('game_bundle failed', error?.message ?? error);
    return json({ error: 'The game bundle is unavailable.' }, 500);
  }
});
