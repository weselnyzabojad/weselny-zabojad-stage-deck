// Supabase Edge Function: admin_drive (owner only, issue #168)
//
// Proves the server-only Google Drive REST v3 connection. Every request carries
// a Supabase Auth access token from an allowlisted owner with AAL2 TOTP MFA.
// Stage-role JWTs and anonymous callers are rejected before any Google call.
//
// Google credentials stay in Edge Function secrets. The browser never receives
// the service-account email/private key, access tokens or raw Google errors.
//
// Deploy:
//   supabase functions deploy admin_drive
// Secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ALLOWED_ORIGIN,
//   GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
//   GOOGLE_DRIVE_TEST_FILE_ID (optional default for the status action)

import { createClient } from 'npm:@supabase/supabase-js@2';
import { authorizeAdminSession, decodeJwt } from '../_shared/adminAuth.js';
import {
  createGoogleDriveConnector,
  driveErrorHttpStatus,
} from '../_shared/googleDrive.js';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
const connector = createGoogleDriveConnector({
  clientEmail: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL') ?? '',
  privateKey: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY') ?? '',
});

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
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

    const body = await req.json().catch(() => null);
    const action = typeof body?.action === 'string' ? body.action : '';
    if (action !== 'status' && action !== 'metadata') {
      return json({ error: 'Unsupported Drive action.' }, 400);
    }

    const requestedFileId = typeof body?.fileId === 'string' ? body.fileId.trim() : '';
    const defaultFileId = Deno.env.get('GOOGLE_DRIVE_TEST_FILE_ID')?.trim() ?? '';
    const fileId = requestedFileId || defaultFileId;

    if (!fileId) {
      return json(
        {
          error:
            'A Drive file id is required. Share a file with the service account and provide its id.',
          code: 'drive_file_id_required',
        },
        400,
      );
    }

    const file = await connector.getFileMetadata(fileId);
    return json({
      ok: true,
      action,
      checkedAt: new Date().toISOString(),
      file,
    });
  } catch (error: any) {
    if (typeof error?.code === 'string' && error.code.startsWith('drive_')) {
      return json(
        { error: error.message, code: error.code },
        driveErrorHttpStatus(error.code),
      );
    }
    // Never echo raw upstream/private data.
    return json({ error: 'Drive request failed.' }, 500);
  }
});
