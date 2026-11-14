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
import { buildSpeechDocTemplate, parseSpeechDoc, speechDocFilename } from '../_shared/speechDoc.js';
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
      ![
        'status',
        'metadata',
        'list',
        'children',
        'preview',
        'check',
        'parse_speech',
        'create_speech_doc',
        'rename_speech_doc',
        'parse_speech_doc',
      ].includes(action)
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

    if (action === 'create_speech_doc') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const weddingFolderId =
        typeof body?.weddingFolderId === 'string' ? body.weddingFolderId.trim() : '';
      const speechId = typeof body?.speechId === 'string' ? body.speechId.trim() : '';
      const speakerName =
        typeof body?.speakerName === 'string' ? body.speakerName.trim() : '';
      const relationship =
        typeof body?.relationship === 'string' ? body.relationship.trim() : '';
      const speakerLanguage =
        typeof body?.speakerLanguage === 'string' ? body.speakerLanguage.trim().toUpperCase() : '';
      const mcLanguage =
        typeof body?.mcLanguage === 'string' ? body.mcLanguage.trim().toUpperCase() : '';
      const order = Number(body?.order);
      if (
        !weddingId ||
        !weddingFolderId ||
        !speechId ||
        !speakerName ||
        !Number.isInteger(order) ||
        order < 1 ||
        !/^[A-Z]{2}$/.test(speakerLanguage) ||
        !/^[A-Z]{2}$/.test(mcLanguage)
      ) {
        return json({ error: 'Complete speech metadata is required.' }, 400);
      }
      if (speakerLanguage === mcLanguage) {
        return json({ error: 'Speaker and MC languages must differ.' }, 400);
      }
      const folder = await connector.ensureSpeechFolder({ weddingFolderId });
      const name = speechDocFilename({ order, speakerName, relationship });
      const text = buildSpeechDocTemplate({
        speakerName,
        relationship,
        speakerLanguage,
        mcLanguage,
      });
      const file = await connector.createGoogleDoc({
        parentId: folder.folder.id,
        name,
        text,
      });
      const { error } = await admin.from('speech_records').upsert(
        {
          wedding_id: weddingId,
          id: speechId,
          sort_order: order,
          speaker_name: speakerName,
          speaker_relationship: relationship || null,
          speaker_language: speakerLanguage,
          mc_language: mcLanguage,
          speaker_access: body?.speakerAccess !== false,
          drive_doc_id: file.id,
          drive_doc_url: file.webViewLink ?? null,
          drive_doc_name: file.name,
          drive_doc_version: file.version ?? null,
          drive_doc_modified_at: file.modifiedTime ?? null,
          drive_doc_retrieved_at: new Date().toISOString(),
          status: 'DRAFT',
        },
        { onConflict: 'wedding_id,id' },
      );
      if (error) throw error;
      return json({ ok: true, action, folder: folder.folder, file });
    }

    if (action === 'rename_speech_doc') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const speechId = typeof body?.speechId === 'string' ? body.speechId.trim() : '';
      const fileIdValue = typeof body?.fileId === 'string' ? body.fileId.trim() : '';
      const order = Number(body?.order);
      const speakerName =
        typeof body?.speakerName === 'string' ? body.speakerName.trim() : '';
      const relationship =
        typeof body?.relationship === 'string' ? body.relationship.trim() : '';
      if (!weddingId || !speechId || !fileIdValue || !Number.isInteger(order) || !speakerName) {
        return json({ error: 'Complete rename metadata is required.' }, 400);
      }
      const name = speechDocFilename({ order, speakerName, relationship });
      const file = await connector.renameFile({ fileId: fileIdValue, name });
      await admin
        .from('speech_records')
        .update({
          sort_order: order,
          speaker_name: speakerName,
          speaker_relationship: relationship || null,
          drive_doc_name: file.name,
          drive_doc_version: file.version ?? null,
          drive_doc_modified_at: file.modifiedTime ?? null,
          drive_doc_retrieved_at: new Date().toISOString(),
        })
        .eq('wedding_id', weddingId)
        .eq('id', speechId);
      return json({ ok: true, action, file });
    }

    if (action === 'parse_speech_doc') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const speechId = typeof body?.speechId === 'string' ? body.speechId.trim() : '';
      const fileIdValue = typeof body?.fileId === 'string' ? body.fileId.trim() : '';
      const speakerLanguage =
        typeof body?.speakerLanguage === 'string' ? body.speakerLanguage.trim().toUpperCase() : '';
      const mcLanguage =
        typeof body?.mcLanguage === 'string' ? body.mcLanguage.trim().toUpperCase() : '';
      const order = Number(body?.order);
      if (!weddingId || !speechId || !fileIdValue) {
        return json({ error: 'weddingId, speechId and fileId are required.' }, 400);
      }
      const progress = ['fetch', 'parse', 'validate'];
      const source = await connector.readSource(fileIdValue);
      const parsed = parseSpeechDoc(source.text, {
        speakerLanguage,
        mcLanguage,
        order: Number.isInteger(order) ? order : null,
      });
      const errors = parsed.errors;
      if (errors.length > 0) {
        await admin.from('speech_logs').insert(
          errors.map((error) => ({
            wedding_id: weddingId,
            action: 'speech_parse_invalid',
            doc_id: fileIdValue,
            doc_version: source.file.version ?? null,
            error_code: error.code,
            message: error.message,
          })),
        );
        return json(
          {
            ok: false,
            action,
            progress,
            file: source.file,
            errors,
          },
          422,
        );
      }
      await admin
        .from('speech_records')
        .update({
          drive_doc_version: source.file.version ?? null,
          drive_doc_modified_at: source.file.modifiedTime ?? null,
          drive_doc_retrieved_at: source.retrievedAt,
          status: 'READY',
        })
        .eq('wedding_id', weddingId)
        .eq('id', speechId);
      return json({
        ok: true,
        action,
        progress: [...progress, 'encrypt'],
        file: source.file,
        pairs: parsed.pairs,
        script: parsed.script,
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
