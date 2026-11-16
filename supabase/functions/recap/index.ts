// Supabase Edge Function: recap
//
// Public read-only access to a published wedding recap. The caller proves only
// possession of the private token; the token is hashed before lookup and the
// response never includes raw live state or admin data.
//
// Deploy:
//   supabase functions deploy recap
// Secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ALLOWED_ORIGIN (optional)

import { createClient } from 'npm:@supabase/supabase-js@2';
import { isOriginAllowed, withCors } from '../_shared/cors.js';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_ATTEMPTS = 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

function respond(req: Request, body: unknown, status = 200) {
  return withCors(req, json(body, status));
}

function serverEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
}

function clientIp(req: Request) {
  return (
    (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
    (req.headers.get('x-real-ip') ?? '').trim() ||
    'unknown'
  );
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (!isOriginAllowed(req)) {
    return json({ error: 'Origin not allowed.' }, 403);
  }
  if (req.method === 'OPTIONS') {
    return withCors(req, new Response('ok'));
  }
  if (req.method !== 'POST') {
    return respond(req, { error: 'Method not allowed.' }, 405);
  }

  try {
    const body = await req.json().catch(() => null);
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const tokenHash = await sha256(token || 'invalid');
    const ipHash = await sha256(clientIp(req));

    const admin = createClient(
      serverEnv('SUPABASE_URL'),
      serverEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count, error: countError } = await admin
      .from('recap_access_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('attempted_at', since);

    if (countError) throw countError;
    if ((count ?? 0) >= RATE_MAX_ATTEMPTS) {
      return respond(req, { error: 'Too many requests. Try again later.' }, 429);
    }

    const { error: attemptError } = await admin
      .from('recap_access_attempts')
      .insert({ ip_hash: ipHash, token_hash: tokenHash });
    if (attemptError) throw attemptError;

    // Keep the operational rate-limit table bounded.
    void admin
      .from('recap_access_attempts')
      .delete()
      .lt('attempted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!TOKEN_PATTERN.test(token)) {
      return respond(req, { error: 'This recap link is no longer available.' }, 404);
    }

    const { data, error } = await admin
      .from('wedding_recaps')
      .select('payload, expires_at, revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error) throw error;
    if (
      !data ||
      data.revoked_at ||
      !data.expires_at ||
      Date.parse(data.expires_at) <= Date.now()
    ) {
      return respond(req, { error: 'This recap link is no longer available.' }, 404);
    }

    return respond(req, { recap: data.payload });
  } catch (error) {
    console.error('recap failed', error);
    return respond(req, { error: 'This recap link is no longer available.' }, 500);
  }
});
