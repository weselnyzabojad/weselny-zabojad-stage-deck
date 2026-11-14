// Supabase Edge Function: reveal_speech_key (issue #602, ownerless role endpoint)
//
// Returns a per-speech AES key only to a valid `speaker` role JWT for the
// matching wedding. The ciphertext stays in the cartridge; the browser imports
// the key as a non-exportable CryptoKey and decrypts locally.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'npm:jose@5';
import { bytesToBase64Url, deriveSpeechKeyBytes } from '../_shared/speechSecrets.js';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN')?.trim() ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')?.trim() ?? '';
const JWKS = SUPABASE_URL
  ? createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`))
  : null;

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

Deno.serve(async (req) => {
  if (!originAllowed(req)) {
    return json({ error: 'Origin not allowed.' }, 403);
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Sign in first.' }, 401);

    let payload;
    try {
      const header = decodeProtectedHeader(token);
      // ES256 only: the legacy HS256 shared secret was removed after the
      // rotation window (#853).
      if (header.alg !== 'ES256') throw new Error('Only ES256 role tokens are accepted.');
      if (!JWKS) throw new Error('SUPABASE_URL is not configured.');
      ({ payload } = await jwtVerify(token, JWKS, { algorithms: ['ES256'] }));
    } catch {
      return json({ error: 'Invalid role session.' }, 401);
    }

    if (payload.app_role !== 'speaker') {
      return json({ error: 'Only the speaker role can unlock a speech.' }, 403);
    }

    const body = await req.json().catch(() => null);
    const weddingId = typeof payload.wedding_id === 'string' ? payload.wedding_id : '';
    const speechId = typeof body?.speechId === 'string' ? body.speechId.trim() : '';
    if (!weddingId || !speechId) return json({ error: 'A speechId is required.' }, 400);

    const admin = createClient(
      serverEnv('SUPABASE_URL'),
      serverEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    if (typeof payload.jti === 'string' && payload.jti) {
      const { data: session } = await admin
        .from('role_sessions')
        .select('revoked_at, expires_at')
        .eq('jti', payload.jti)
        .maybeSingle();
      if (!session || session.revoked_at) {
        return json({ error: 'This device session has been revoked.' }, 401);
      }
      if (session.expires_at && Date.parse(session.expires_at) < Date.now()) {
        return json({ error: 'This device session has expired.' }, 401);
      }
    }

    const { data: wedding } = await admin
      .from('weddings')
      .select('cartridge')
      .eq('wedding_id', weddingId)
      .maybeSingle();
    const speech = (Array.isArray(wedding?.cartridge?.speeches) ? wedding.cartridge.speeches : [])
      .find((entry: { id?: string }) => entry?.id === speechId);
    if (!speech) return json({ error: 'Speech not found in the published cartridge.' }, 404);

    const visible = Array.isArray(speech.visibleToRoles) ? speech.visibleToRoles : [];
    if (visible.length > 0 && !visible.includes('speaker')) {
      return json({ error: 'This speech is not visible to the speaker role.' }, 403);
    }

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
  } catch (error: any) {
    console.error('reveal_speech_key failed', error?.message ?? error);
    return json({ error: 'Could not unlock the speech.' }, 500);
  }
});
