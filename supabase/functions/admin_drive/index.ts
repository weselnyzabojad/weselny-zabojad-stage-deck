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
import { encryptSecret, parseSecretMarkers } from '../_shared/speechSecrets.js';
import { isOriginAllowed, withCors } from '../_shared/cors.js';

const connector = createGoogleDriveConnector({
  clientEmail: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL') ?? '',
  privateKey: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY') ?? '',
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

    const body = await req.json().catch(() => null);
    const action = typeof body?.action === 'string' ? body.action : '';
    if (
      !['status', 'metadata', 'list', 'children', 'preview', 'check', 'parse_speech'].includes(
        action,
      )
    ) {
      return json({ error: 'Unsupported Drive action.' }, 400);
    }

    if (action === 'children') {
      const result = await connector.listChildren({
        parentId: typeof body?.parentId === 'string' ? body.parentId : '',
        name: typeof body?.name === 'string' ? body.name : '',
        nameContains: typeof body?.nameContains === 'string' ? body.nameContains : '',
        mimeType: typeof body?.mimeType === 'string' ? body.mimeType : undefined,
        pageToken: typeof body?.pageToken === 'string' ? body.pageToken : null,
        pageSize: body?.pageSize,
      });
      return json(result);
    }

    if (action === 'status') {
      return json({
        ok: true,
        action,
        checkedAt: new Date().toISOString(),
        configured: connector.isConfigured,
        function: 'admin_drive',
      });
    }

    if (action === 'list') {
      const result = await connector.listFiles({
        query: typeof body?.query === 'string' ? body.query : '',
        pageToken: typeof body?.pageToken === 'string' ? body.pageToken : null,
        pageSize: body?.pageSize,
      });
      return json({
        ok: true,
        action,
        checkedAt: new Date().toISOString(),
        files: result.files,
        nextPageToken: result.nextPageToken,
      });
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

    if (action === 'check') {
      const file = await connector.getFileMetadata(fileId);
      const expectedVersion =
        typeof body?.expectedVersion === 'string' ? body.expectedVersion.trim() : '';
      const expectedChecksum =
        typeof body?.expectedChecksum === 'string' ? body.expectedChecksum.trim() : '';
      const versionChanged = Boolean(expectedVersion && expectedVersion !== file.version);
      const checksumChanged = Boolean(expectedChecksum && expectedChecksum !== file.md5Checksum);
      return json({
        ok: true,
        action,
        checkedAt: new Date().toISOString(),
        file,
        changed: versionChanged || checksumChanged,
        reason: versionChanged
          ? 'version'
          : checksumChanged
            ? 'checksum'
            : 'unchanged',
      });
    }

    if (action === 'preview') {
      const source = await connector.readSource(fileId);
      return json({
        ok: true,
        action,
        checkedAt: new Date().toISOString(),
        file: source.file,
        kind: source.kind,
        text: source.text,
        bytes: source.bytes,
        retrievedAt: source.retrievedAt,
      });
    }

    if (action === 'parse_speech') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const speechId = typeof body?.speechId === 'string' ? body.speechId.trim() : '';
      if (!weddingId || !speechId) {
        return json({ error: 'weddingId and speechId are required.' }, 400);
      }
      const source = await connector.readSource(fileId);
      const parsed = parseSecretMarkers(source.text);
      const masterKey = Deno.env.get('SPEECH_SECRET_MASTER_KEY') ?? '';
      if (parsed.secrets.length > 0 && !masterKey) {
        return json(
          {
            error: 'Speech secret encryption is not configured.',
            code: 'speech_secrets_not_configured',
          },
          503,
        );
      }
      const redactions = [];
      for (const secret of parsed.secrets) {
        redactions.push(
          await encryptSecret({
            masterKey,
            weddingId,
            speechId,
            redactionId: secret.id,
            plaintext: secret.plaintext,
          }),
        );
      }
      return json({
        ok: true,
        action,
        checkedAt: new Date().toISOString(),
        file: source.file,
        kind: source.kind,
        text: parsed.text,
        redactions,
        secretCount: redactions.length,
        bytes: source.bytes,
        retrievedAt: source.retrievedAt,
      });
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
}

Deno.serve(async (req) => withCors(req, await handleRequest(req)));
