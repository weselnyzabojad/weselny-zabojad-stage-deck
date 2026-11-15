// Supabase Edge Function: service_health (issue #979)
//
// Owner-only health probe for the admin monitoring bar. Everything is measured
// server-side so provider tokens (notably SENTRY_API_TOKEN) never reach the
// browser. The function is read-only: the Drive probe fetches metadata and
// never creates, moves or renames anything.
//
// Deploy:
//   supabase functions deploy service_health
// Secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ALLOWED_ORIGIN
//   SENTRY_API_TOKEN, SENTRY_ORG_SLUG, SENTRY_PROJECT_SLUG
//   GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
// Optional:
//   SENTRY_API_BASE, SUNSET_HEALTH_URL, GOOGLE_DRIVE_API_BASE,
//   GOOGLE_DRIVE_HEALTH_FILE_ID

import { createClient } from 'npm:@supabase/supabase-js@2';
import { authorizeAdminSession, decodeJwt } from '../_shared/adminAuth.js';
import { createGoogleDriveConnector } from '../_shared/googleDrive.js';
import { isOriginAllowed, withCors } from '../_shared/cors.js';
import { runServiceHealth } from '../_shared/serviceHealth.js';

const connector = createGoogleDriveConnector({
  clientEmail: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL') ?? '',
  privateKey: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY') ?? '',
  apiBase: Deno.env.get('GOOGLE_DRIVE_API_BASE') ?? '',
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function serverEnv(name: string) {
  const value = Deno.env.get(name) ?? '';
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
}

function envOr(name: string, fallback: string) {
  const value = Deno.env.get(name) ?? '';
  return value.trim() ? value : fallback;
}

async function handleRequest(req: Request) {
  if (!isOriginAllowed(req)) {
    return json({ error: 'Origin not allowed.' }, 403);
  }
  if (req.method === 'OPTIONS') return new Response('ok');
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Sign in first.' }, 401);

    const admin = createClient(
      serverEnv('SUPABASE_URL'),
      serverEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: 'Invalid admin session.' }, 401);

    const { data: allowlisted } = await admin
      .from('app_admins')
      .select('user_id, email')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    const authorized = authorizeAdminSession({
      user: userData.user,
      allowlisted,
      claims: decodeJwt(token),
    });
    if (!authorized.ok) {
      return json(
        { error: authorized.error, requiresMfa: Boolean(authorized.requiresMfa) },
        authorized.status,
      );
    }

    const result = await runServiceHealth({
      supabase: {
        url: serverEnv('SUPABASE_URL'),
        serviceKey: serverEnv('SUPABASE_SERVICE_ROLE_KEY'),
      },
      sentry: {
        apiBase: envOr('SENTRY_API_BASE', 'https://sentry.io/api/0'),
        orgSlug: Deno.env.get('SENTRY_ORG_SLUG') ?? '',
        projectSlug: Deno.env.get('SENTRY_PROJECT_SLUG') ?? '',
        token: Deno.env.get('SENTRY_API_TOKEN') ?? '',
      },
      drive: {
        connector,
        fileId: envOr(
          'GOOGLE_DRIVE_HEALTH_FILE_ID',
          '1Q7IVT0GNiLztKQE8l4eCDCRw-px1qheh',
        ),
      },
      sunset: {
        url: envOr(
          'SUNSET_HEALTH_URL',
          'https://api.sunrise-sunset.org/json?lat=52.2297&lng=21.0122&formatted=0',
        ),
      },
      deck: {
        url: envOr('PUBLIC_DECK_URL', 'https://deck.weselnyzabojad.pl/'),
      },
    });

    return json(result);
  } catch (error) {
    console.error('service_health failed', error);
    return json({ error: 'Health check failed. Try again shortly.' }, 500);
  }
}

Deno.serve(async (req) => withCors(req, await handleRequest(req)));
