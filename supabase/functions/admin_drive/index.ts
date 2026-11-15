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
  DRIVE_DOC_MIME_TYPE,
} from '../_shared/googleDrive.js';
import {
  buildGameQuestionDocTemplate,
  defaultGameId,
  defaultGameTitle,
  gameQuestionDocCreatePreflight,
  gameQuestionDocFileName,
  gameQuestionDocFolderPath,
  normalizeGameLanguages,
  normalizeGameType,
  parseGameQuestionDoc,
  rebuildGameQuestionDocColumns,
} from '../_shared/gameQuestions.js';
import {
  buildSpeechDocTemplate,
  parseSpeechDoc,
  speechDocCreationAuthorization,
  speechDocFilename,
} from '../_shared/speechDoc.js';
import { isOriginAllowed, withCors } from '../_shared/cors.js';

const WEDDING_ID_PATTERN = /^[A-Za-z0-9&]+-UM-\d{4}-\d{2}-\d{3}$/;

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

function gameQuestionDocRecord({
  weddingId,
  gameType,
  gameId,
  title,
  file,
  folderId = null,
  languages,
  status,
  reviewRequired,
  questionCount,
  lastParsedAt = null,
  retrievedAt = new Date().toISOString(),
}: {
  weddingId: string;
  gameType: string;
  gameId?: string | null;
  title?: string | null;
  file: any;
  folderId?: string | null;
  languages: string[];
  status: string;
  reviewRequired: boolean;
  questionCount: number;
  lastParsedAt?: string | null;
  retrievedAt?: string;
}) {
  return {
    wedding_id: weddingId,
    game_type: gameType,
    game_id: gameId || defaultGameId(gameType),
    title: title || defaultGameTitle(gameType),
    drive_doc_id: file?.id ?? null,
    drive_doc_url:
      file?.webViewLink ??
      (file?.id ? `https://docs.google.com/document/d/${file.id}/edit` : null),
    drive_doc_name: file?.name ?? null,
    drive_doc_version: file?.version ?? null,
    drive_doc_modified_at: file?.modifiedTime ?? null,
    drive_doc_retrieved_at: retrievedAt,
    drive_folder_id: folderId,
    languages,
    status,
    review_required: reviewRequired,
    question_count: questionCount,
    last_parsed_at: lastParsedAt,
  };
}

async function upsertGameQuestionDoc(admin: any, record: Record<string, unknown>) {
  const { error } = await admin
    .from('game_question_docs')
    .upsert(record, { onConflict: 'wedding_id,game_type' });
  if (error) throw error;
}

// Issue #974: the stored wedding cartridge is the only creation authority.
// This read happens before any Drive call in both create actions.
async function loadWeddingCartridge(admin: any, weddingId: string) {
  const { data } = await admin
    .from('weddings')
    .select('cartridge')
    .eq('wedding_id', weddingId)
    .maybeSingle();
  return data?.cartridge && typeof data.cartridge === 'object' ? data.cartridge : null;
}

// The admin wedding summary does not carry the Drive folder id. When the panel
// omits it, resolve the wedding folder from the cartridge source file parent.
async function resolveWeddingFolderId(admin: any, weddingId: string, explicit: unknown) {
  const provided = typeof explicit === 'string' ? explicit.trim() : '';
  if (provided) return provided;
  const { data } = await admin
    .from('weddings')
    .select('cartridge_source_metadata')
    .eq('wedding_id', weddingId)
    .maybeSingle();
  const sourceFileId = data?.cartridge_source_metadata?.driveFileId;
  if (typeof sourceFileId !== 'string' || !sourceFileId.trim()) return '';
  try {
    const source = await connector.getFileMetadata(sourceFileId.trim());
    return Array.isArray(source?.parents) ? source.parents[0] ?? '' : '';
  } catch {
    return '';
  }
}

function expectedGameQuestionFolder(source: any, folderId: string | null) {
  if (!folderId) return false;
  return Array.isArray(source?.file?.parents) && source.file.parents.includes(folderId);
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
        'create_game_question_doc',
        'rewrite_game_question_doc_columns',
        'parse_game_question_doc',
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
      const cartridge = await loadWeddingCartridge(admin, weddingId);
      if (!cartridge) {
        return json(
          {
            error: 'The stored wedding cartridge is missing. Republish the wedding Doc first.',
            code: 'missing_cartridge',
          },
          409,
        );
      }
      const authorization = speechDocCreationAuthorization(cartridge);
      if (!authorization.allowed) {
        return json({ error: authorization.error, code: authorization.code }, 409);
      }
      const folder = await connector.ensureSpeechFolder({ weddingFolderId, weddingId });
      const name = speechDocFilename({ weddingId, order, speakerName, relationship });
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
          drive_folder_id: folder.folder.id,
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
      const name = speechDocFilename({ weddingId, order, speakerName, relationship });
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

    if (action === 'create_game_question_doc') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      if (!WEDDING_ID_PATTERN.test(weddingId)) {
        return json({ error: 'weddingId is required.' }, 400);
      }
      const cartridge = await loadWeddingCartridge(admin, weddingId);
      if (!cartridge) {
        return json(
          {
            error: 'The stored wedding cartridge is missing. Republish the wedding Doc first.',
            code: 'missing_cartridge',
          },
          409,
        );
      }
      const preflight = gameQuestionDocCreatePreflight({
        cartridge,
        gameType: body?.gameType,
        languages: body?.languages,
      });
      if (preflight.error) {
        return json(
          { error: preflight.error, code: preflight.code },
          preflight.code === 'not_requested' ? 409 : 400,
        );
      }
      const { gameType, languages } = preflight.value;
      const weddingFolderId = await resolveWeddingFolderId(
        admin,
        weddingId,
        body?.weddingFolderId,
      );
      if (!weddingFolderId) {
        return json(
          {
            error: 'The wedding Drive folder could not be resolved.',
            code: 'missing_wedding_folder',
          },
          409,
        );
      }
      const gameId =
        typeof body?.gameId === 'string' && body.gameId.trim()
          ? body.gameId.trim()
          : defaultGameId(gameType);
      const title =
        typeof body?.title === 'string' && body.title.trim()
          ? body.title.trim()
          : defaultGameTitle(gameType);
      const path = gameQuestionDocFolderPath(gameType, weddingId);
      const folder = await connector.ensureFolderPath({
        weddingFolderId,
        segments: path.segments,
        scope: path.scope,
      });
      const name = gameQuestionDocFileName(gameType, weddingId);
      const existing = await connector.listChildren({
        parentId: folder.folder.id,
        name,
        mimeType: DRIVE_DOC_MIME_TYPE,
      });
      if (existing.files[0]) {
        const { data: current } = await admin
          .from('game_question_docs')
          .select('status, review_required, question_count, last_parsed_at, languages')
          .eq('wedding_id', weddingId)
          .eq('game_type', gameType)
          .maybeSingle();
        const storedLanguages = Array.isArray(current?.languages)
          ? normalizeGameLanguages(current.languages) ?? languages
          : languages;
        await upsertGameQuestionDoc(
          admin,
          gameQuestionDocRecord({
            weddingId,
            gameType,
            gameId,
            title,
            file: existing.files[0],
            folderId: folder.folder.id,
            languages: storedLanguages,
            status: current?.status ?? 'DRAFT',
            reviewRequired: Boolean(current?.review_required),
            questionCount: Number(current?.question_count ?? 0),
            lastParsedAt: current?.last_parsed_at ?? null,
          }),
        );
        return json({
          ok: true,
          action,
          created: false,
          folder: folder.folder,
          file: existing.files[0],
          languages: storedLanguages,
        });
      }
      const text = buildGameQuestionDocTemplate({ gameType, languages });
      const file = await connector.createGoogleDoc({
        parentId: folder.folder.id,
        name,
        text,
      });
      await upsertGameQuestionDoc(
        admin,
        gameQuestionDocRecord({
          weddingId,
          gameType,
          gameId,
          title,
          file,
          folderId: folder.folder.id,
          languages,
          status: 'DRAFT',
          reviewRequired: false,
          questionCount: 0,
        }),
      );
      await admin.from('game_question_logs').insert({
        wedding_id: weddingId,
        game_type: gameType,
        actor: allowlisted.email,
        action: 'game_question_doc_create',
        message: name,
      });
      return json({ ok: true, action, created: true, folder: folder.folder, file, languages });
    }

    if (action === 'rewrite_game_question_doc_columns') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const gameType = normalizeGameType(body?.gameType);
      const languages = normalizeGameLanguages(body?.languages);
      if (!WEDDING_ID_PATTERN.test(weddingId) || !gameType) {
        return json({ error: 'weddingId and gameType are required.' }, 400);
      }
      if (!languages || languages.length === 0) {
        return json(
          { error: 'At least one ordered ISO 639-1 language is required.', code: 'missing_languages' },
          400,
        );
      }
      const { data: current } = await admin
        .from('game_question_docs')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('game_type', gameType)
        .maybeSingle();
      const fileIdValue =
        typeof body?.fileId === 'string' && body.fileId.trim()
          ? body.fileId.trim()
          : current?.drive_doc_id ?? '';
      if (!fileIdValue) {
        return json({ error: 'A question Doc id is required.', code: 'missing_file_id' }, 400);
      }
      const source = await connector.readSource(fileIdValue);
      const folderId =
        (typeof body?.folderId === 'string' && body.folderId.trim()) ||
        current?.drive_folder_id ||
        null;
      if (folderId && !expectedGameQuestionFolder(source, folderId)) {
        await admin.from('game_question_logs').insert({
          wedding_id: weddingId,
          game_type: gameType,
          actor: allowlisted.email,
          action: 'game_question_doc_parse_invalid',
          code: 'wrong_folder',
          message: fileIdValue,
        });
        return json(
          { error: 'The question Doc is not in the expected game folder.', code: 'wrong_folder' },
          422,
        );
      }
      const rebuilt = rebuildGameQuestionDocColumns(source.text, gameType, languages);
      if (!rebuilt.changed) {
        return json({
          ok: true,
          action,
          changed: false,
          languages,
          file: source.file,
          reviewRequired: Boolean(current?.review_required),
        });
      }
      const file = await connector.updateGoogleDocText({ fileId: fileIdValue, text: rebuilt.text });
      await upsertGameQuestionDoc(
        admin,
        gameQuestionDocRecord({
          weddingId,
          gameType,
          gameId: current?.game_id,
          title: current?.title,
          file,
          folderId,
          languages,
          status: 'NEEDS_REVIEW',
          reviewRequired: true,
          questionCount: 0,
          lastParsedAt: null,
          retrievedAt: source.retrievedAt,
        }),
      );
      await admin.from('game_question_logs').insert({
        wedding_id: weddingId,
        game_type: gameType,
        actor: allowlisted.email,
        action: 'game_question_doc_columns_rewrite',
        message: JSON.stringify({
          added: rebuilt.addedLanguages,
          removed: rebuilt.removedLanguages,
          dropped: rebuilt.droppedColumns,
          languages,
        }),
      });
      return json({
        ok: true,
        action,
        changed: true,
        languages,
        addedLanguages: rebuilt.addedLanguages,
        removedLanguages: rebuilt.removedLanguages,
        reviewRequired: true,
        file,
      });
    }

    if (action === 'parse_game_question_doc') {
      const weddingId = typeof body?.weddingId === 'string' ? body.weddingId.trim() : '';
      const gameType = normalizeGameType(body?.gameType);
      const languages = normalizeGameLanguages(body?.languages);
      if (!WEDDING_ID_PATTERN.test(weddingId) || !gameType) {
        return json({ error: 'weddingId and gameType are required.' }, 400);
      }
      if (!languages || languages.length === 0) {
        return json(
          { error: 'The order content languages list is missing.', code: 'missing_languages' },
          409,
        );
      }
      if (body?.docReady !== true) {
        return json(
          { error: 'Tick "Doc ready" before parsing the question Doc.', code: 'doc_not_ready' },
          409,
        );
      }
      const { data: current } = await admin
        .from('game_question_docs')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('game_type', gameType)
        .maybeSingle();
      const fileIdValue =
        typeof body?.fileId === 'string' && body.fileId.trim()
          ? body.fileId.trim()
          : current?.drive_doc_id ?? '';
      if (!fileIdValue) {
        return json({ error: 'A question Doc id is required.', code: 'missing_file_id' }, 400);
      }
      const folderId =
        (typeof body?.folderId === 'string' && body.folderId.trim()) ||
        current?.drive_folder_id ||
        null;
      if (!folderId) {
        return json(
          {
            error: 'The expected question Doc folder id is required to validate the source.',
            code: 'missing_expected_folder',
          },
          400,
        );
      }
      if (current?.review_required && body?.reviewed !== true) {
        return json(
          {
            error: 'The Doc columns changed. Review the Doc and confirm before re-parsing.',
            code: 'review_required',
          },
          409,
        );
      }

      let source;
      try {
        source = await connector.readSource(fileIdValue);
      } catch (error: any) {
        await admin.from('game_question_logs').insert({
          wedding_id: weddingId,
          game_type: gameType,
          actor: allowlisted.email,
          action: 'game_question_doc_parse_invalid',
          code: typeof error?.code === 'string' ? error.code : 'unreadable_doc',
          message: typeof error?.message === 'string' ? error.message : fileIdValue,
        });
        throw error;
      }

      if (!expectedGameQuestionFolder(source, folderId)) {
        await admin.from('game_question_logs').insert({
          wedding_id: weddingId,
          game_type: gameType,
          actor: allowlisted.email,
          action: 'game_question_doc_parse_invalid',
          code: 'wrong_folder',
          message: fileIdValue,
        });
        return json(
          { error: 'The question Doc is not in the expected game folder.', code: 'wrong_folder' },
          422,
        );
      }

      const parsed = parseGameQuestionDoc(source.text, gameType, { languages });
      if (parsed.errors.length > 0) {
        await admin.from('game_question_logs').insert(
          parsed.errors.slice(0, 20).map((error) => ({
            wedding_id: weddingId,
            game_type: gameType,
            actor: allowlisted.email,
            action: 'game_question_doc_parse_invalid',
            code: error.code,
            message: error.message,
          })),
        );
        await upsertGameQuestionDoc(
          admin,
          gameQuestionDocRecord({
            weddingId,
            gameType,
            gameId: current?.game_id,
            title: current?.title,
            file: source.file,
            folderId,
            languages,
            status: 'NEEDS_REVIEW',
            reviewRequired: true,
            questionCount: 0,
            lastParsedAt: null,
            retrievedAt: source.retrievedAt,
          }),
        );
        return json(
          {
            ok: false,
            action,
            progress: ['fetch', 'parse', 'validate'],
            file: source.file,
            languages,
            errors: parsed.errors,
          },
          422,
        );
      }

      await upsertGameQuestionDoc(
        admin,
        gameQuestionDocRecord({
          weddingId,
          gameType,
          gameId: current?.game_id,
          title: current?.title,
          file: source.file,
          folderId,
          languages,
          status: 'PARSED',
          reviewRequired: false,
          questionCount: parsed.questions.length,
          lastParsedAt: new Date().toISOString(),
          retrievedAt: source.retrievedAt,
        }),
      );
      await admin.from('game_question_logs').insert({
        wedding_id: weddingId,
        game_type: gameType,
        actor: allowlisted.email,
        action: 'game_question_doc_parse',
        message: `Parsed ${parsed.questions.length} questions`,
      });
      return json({
        ok: true,
        action,
        progress: ['fetch', 'parse', 'validate', 'encrypt'],
        file: source.file,
        languages,
        questions: parsed.questions,
        readyForBundle: true,
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
