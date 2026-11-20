import { generateKeyPairSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DRIVE_DOC_MIME_TYPE,
  DRIVE_FOLDER_MIME_TYPE,
  GOOGLE_TOKEN_ENDPOINT,
  createGoogleDriveConnector,
} from '../supabase/functions/_shared/googleDrive.js';
import {
  buildDocMigrationPlan,
  evaluateDocMigration,
  executeDocMigration,
  gameMigrationTarget,
  isUmWeddingId,
  resolveFolderTrail,
  speechMigrationTarget,
} from '../supabase/functions/_shared/docMigration.js';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const WEDDING_ID = 'Weronika&Guillaume-UM-2027-04-002';
const WEDDING_FOLDER_ID = 'wedding-folder';
const MONTH_FOLDER_ID = 'month';
const YEAR_FOLDER_ID = 'year';
const OUTSIDE_FOLDER_ID = 'other-wedding';
const OLD_FOLDER_ID = 'old-folder';
const GAMES_FOLDER_ID = 'games-folder';
const SECRETS_FOLDER_ID = 'secrets-folder';
const PRIVATE_WEDDING_FOLDER_ID = 'private-wedding-folder';
const SPEECHES_FOLDER_ID = 'speeches-folder';
const COMPATIBILITY_FOLDER_ID = 'compatibility-folder';

const speechName = `${WEDDING_ID} - 1 - Bartek - Best man`;
const gameName = `Test Wiedzy - ${WEDDING_ID}`;

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    async json() {
      return body;
    },
  };
}

function folder(id, name, parents) {
  return {
    id,
    name,
    mimeType: DRIVE_FOLDER_MIME_TYPE,
    parents,
    version: '1',
    modifiedTime: '2026-11-15T10:00:00.000Z',
  };
}

function doc(id, name, parents) {
  return {
    id,
    name,
    mimeType: DRIVE_DOC_MIME_TYPE,
    parents,
    version: '3',
    modifiedTime: '2026-11-15T10:00:00.000Z',
    webViewLink: `https://docs.google.com/document/d/${id}/edit`,
  };
}

function createFakeDrive({ docs: initialDocs = [] } = {}) {
  const folders = new Map([
    [YEAR_FOLDER_ID, folder(YEAR_FOLDER_ID, '2027', [])],
    [MONTH_FOLDER_ID, folder(MONTH_FOLDER_ID, 'April', [YEAR_FOLDER_ID])],
    [WEDDING_FOLDER_ID, folder(WEDDING_FOLDER_ID, WEDDING_ID, [MONTH_FOLDER_ID])],
    [OUTSIDE_FOLDER_ID, folder(OUTSIDE_FOLDER_ID, 'Another wedding', [])],
    [OLD_FOLDER_ID, folder(OLD_FOLDER_ID, 'old-speeches', [WEDDING_FOLDER_ID])],
    [GAMES_FOLDER_ID, folder(GAMES_FOLDER_ID, 'games', [WEDDING_FOLDER_ID])],
    [SECRETS_FOLDER_ID, folder(SECRETS_FOLDER_ID, 'secrets', [MONTH_FOLDER_ID])],
    [PRIVATE_WEDDING_FOLDER_ID, folder(PRIVATE_WEDDING_FOLDER_ID, WEDDING_ID, [SECRETS_FOLDER_ID])],
    [SPEECHES_FOLDER_ID, folder(SPEECHES_FOLDER_ID, 'speeches', [PRIVATE_WEDDING_FOLDER_ID])],
    [
      COMPATIBILITY_FOLDER_ID,
      folder(COMPATIBILITY_FOLDER_ID, 'compatibility-test-game', [PRIVATE_WEDDING_FOLDER_ID]),
    ],
  ]);
  const docs = new Map(initialDocs.map((entry) => [entry.id, entry]));
  const mutations = [];
  let sequence = 0;

  const copy = (entry) => JSON.parse(JSON.stringify(entry));

  async function fetchImpl(url, options = {}) {
    if (url === GOOGLE_TOKEN_ENDPOINT) {
      return jsonResponse(200, { access_token: 'token-969', expires_in: 3600 });
    }
    const parsed = new URL(url);
    const method = options.method ?? 'GET';

    if (method === 'POST') {
      const body = JSON.parse(options.body);
      const created = folder(`folder-${(sequence += 1)}`, body.name, body.parents);
      folders.set(created.id, created);
      mutations.push({ type: 'create-folder', id: created.id, name: created.name });
      return jsonResponse(200, copy(created));
    }

    if (method === 'PATCH') {
      const id = decodeURIComponent(parsed.pathname.split('/').pop());
      const file = docs.get(id) ?? folders.get(id);
      if (!file) return jsonResponse(404, null);
      const added = parsed.searchParams.get('addParents');
      const removed = parsed.searchParams.get('removeParents');
      if (added) {
        const parents = new Set(file.parents);
        parents.add(added);
        for (const parent of String(removed ?? '').split(',')) {
          if (parent) parents.delete(parent);
        }
        file.parents = [...parents];
        mutations.push({ type: 'move', id, parentId: added });
      } else if (options.body && options.body !== '{}') {
        const body = JSON.parse(options.body);
        if (typeof body.name === 'string') {
          file.name = body.name;
          file.version = String(Number(file.version) + 1);
          mutations.push({ type: 'rename', id, name: body.name });
        }
      }
      return jsonResponse(200, copy(file));
    }

    if (method === 'GET' && /\/files\/[^/]+$/.test(parsed.pathname)) {
      const id = decodeURIComponent(parsed.pathname.split('/').pop());
      const file = folders.get(id) ?? docs.get(id);
      return file ? jsonResponse(200, copy(file)) : jsonResponse(404, null);
    }

    if (method === 'GET') {
      const query = parsed.searchParams.get('q') ?? '';
      const parentId = /'([^']*)' in parents/.exec(query)?.[1] ?? '';
      const name = /name = '([^']*)'/.exec(query)?.[1] ?? '';
      const mimeType = /mimeType = '([^']*)'/.exec(query)?.[1] ?? '';
      const files = [...folders.values(), ...docs.values()].filter(
        (entry) =>
          entry.parents.includes(parentId) &&
          (!name || entry.name === name) &&
          (!mimeType || entry.mimeType === mimeType),
      );
      return jsonResponse(200, { files: files.map(copy) });
    }

    throw new Error(`Unexpected Drive request: ${method} ${url}`);
  }

  return { folders, docs, mutations, fetchImpl };
}

function connectorFor(drive) {
  return createGoogleDriveConnector({
    clientEmail: 'service@example.iam.gserviceaccount.com',
    privateKey,
    fetchImpl: drive.fetchImpl,
    sleep: async () => {},
  });
}

const speech = (overrides = {}) => ({
  id: 'speech_1',
  sort_order: 1,
  speaker_name: 'Bartek',
  speaker_relationship: 'Best man',
  drive_doc_id: 'doc-speech',
  ...overrides,
});

const gameDoc = (overrides = {}) => ({
  game_type: 'TEST_WIEDZY',
  drive_doc_id: 'doc-wiedzy',
  ...overrides,
});

describe('issue #969 UM Doc migration', () => {
  it('builds the exact UM target names and folders', () => {
    expect(
      speechMigrationTarget(WEDDING_ID, speech()),
    ).toMatchObject({
      kind: 'speech',
      name: speechName,
      scope: 'private',
      segments: ['secrets', WEDDING_ID, 'speeches'],
    });
    expect(gameMigrationTarget(WEDDING_ID, gameDoc())).toMatchObject({
      kind: 'game',
      name: gameName,
      scope: 'wedding',
      segments: ['games'],
      displayPath: [WEDDING_ID, 'games'],
    });
    expect(
      gameMigrationTarget(WEDDING_ID, gameDoc({ game_type: 'TEST_ZGODNOSCI' })),
    ).toMatchObject({
      name: `Test Zgodności - ${WEDDING_ID}`,
      scope: 'private',
      segments: ['secrets', WEDDING_ID, 'compatibility-test-game'],
    });
    expect(isUmWeddingId(WEDDING_ID)).toBe(true);
    expect(isUmWeddingId('2025-01-01_legacy_wedding')).toBe(false);
  });

  it('classifies already-migrated, conflict, wrong-folder and missing-file Docs', () => {
    const target = speechMigrationTarget(WEDDING_ID, speech());
    expect(
      evaluateDocMigration({
        weddingIdValid: true,
        weddingFolderId: WEDDING_FOLDER_ID,
        file: doc('doc-speech', speechName, [SPEECHES_FOLDER_ID]),
        target,
        targetFolderId: SPEECHES_FOLDER_ID,
        trail: { underRoot: true, names: ['secrets', WEDDING_ID, 'speeches'] },
      }),
    ).toEqual({ status: 'already-migrated', feasible: true });
    expect(
      evaluateDocMigration({
        weddingIdValid: true,
        weddingFolderId: WEDDING_FOLDER_ID,
        file: doc('doc-speech', speechName, [SPEECHES_FOLDER_ID]),
        target,
        targetFolderId: SPEECHES_FOLDER_ID,
        conflictFileId: 'other-doc',
        trail: { underRoot: true, names: [] },
      }),
    ).toEqual({ status: 'target-conflict', feasible: false });
    expect(
      evaluateDocMigration({
        weddingIdValid: true,
        weddingFolderId: WEDDING_FOLDER_ID,
        file: doc('doc-speech', 'old', [OUTSIDE_FOLDER_ID]),
        target,
        trail: { underRoot: false, names: [] },
      }),
    ).toEqual({ status: 'wrong-folder', feasible: false });
    expect(
      evaluateDocMigration({
        weddingIdValid: true,
        weddingFolderId: WEDDING_FOLDER_ID,
        file: null,
        target,
      }),
    ).toEqual({ status: 'missing-file', feasible: false });
    expect(
      evaluateDocMigration({
        weddingIdValid: false,
        weddingFolderId: WEDDING_FOLDER_ID,
        file: doc('doc-speech', 'old', [OLD_FOLDER_ID]),
        target,
      }),
    ).toEqual({ status: 'invalid-wedding-id', feasible: false });
  });

  it('reports a folder trail only when the Doc lives under the month root', async () => {
    const drive = createFakeDrive();
    const driveApi = connectorFor(drive);
    const getFileMetadata = (id) => driveApi.getFileMetadata(id);
    expect(
      await resolveFolderTrail({
        folderId: SPEECHES_FOLDER_ID,
        rootFolderId: MONTH_FOLDER_ID,
        getFileMetadata,
      }),
    ).toEqual({
      underRoot: true,
      folderIds: [SECRETS_FOLDER_ID, PRIVATE_WEDDING_FOLDER_ID, SPEECHES_FOLDER_ID],
      names: ['secrets', WEDDING_ID, 'speeches'],
    });
    expect(
      await resolveFolderTrail({
        folderId: OUTSIDE_FOLDER_ID,
        rootFolderId: MONTH_FOLDER_ID,
        getFileMetadata,
      }),
    ).toMatchObject({ underRoot: false });
  });

  it('moves and renames only feasible Docs, then skips them on rerun', async () => {
    const drive = createFakeDrive({
      docs: [
        doc('doc-speech', 'old speech', [OLD_FOLDER_ID]),
        doc('doc-wiedzy', 'old questions', [OLD_FOLDER_ID]),
        doc('doc-zgodnosci', 'old compatibility', [OLD_FOLDER_ID]),
      ],
    });
    const driveApi = connectorFor(drive);
    const speeches = [speech()];
    const gameDocs = [
      gameDoc(),
      gameDoc({ game_type: 'TEST_ZGODNOSCI', drive_doc_id: 'doc-zgodnosci' }),
    ];
    const plan = await buildDocMigrationPlan({
      weddingId: WEDDING_ID,
      weddingFolderId: WEDDING_FOLDER_ID,
      speeches,
      gameDocs,
      connector: driveApi,
    });

    expect(plan.weddingIdValid).toBe(true);
    expect(plan.monthPath).toEqual(['2027', 'April']);
    expect(plan.counts.ready).toBe(3);
    expect(plan.entries).toHaveLength(3);

    const execution = await executeDocMigration({ plan, connector: driveApi });
    expect(execution.summary).toMatchObject({ migrated: 3, renamed: 3, moved: 3, failed: 0 });
    expect(drive.docs.get('doc-speech')).toMatchObject({
      id: 'doc-speech',
      name: speechName,
      parents: [SPEECHES_FOLDER_ID],
    });
    expect(drive.docs.get('doc-wiedzy')).toMatchObject({
      name: gameName,
      parents: [GAMES_FOLDER_ID],
    });
    expect(drive.docs.get('doc-zgodnosci')).toMatchObject({
      name: `Test Zgodności - ${WEDDING_ID}`,
      parents: [COMPATIBILITY_FOLDER_ID],
    });
    expect(
      [...drive.folders.values()].some(
        (entry) => entry.name === 'secrets' && entry.parents.includes(WEDDING_FOLDER_ID),
      ),
    ).toBe(false);

    const retry = await buildDocMigrationPlan({
      weddingId: WEDDING_ID,
      weddingFolderId: WEDDING_FOLDER_ID,
      speeches,
      gameDocs,
      connector: driveApi,
    });
    expect(retry.counts.alreadyMigrated).toBe(3);
    expect(retry.counts.ready).toBe(0);
    const retryExecution = await executeDocMigration({ plan: retry, connector: driveApi });
    expect(retryExecution.summary).toMatchObject({ migrated: 0, skipped: 3 });
    expect(
      retryExecution.results
        .filter((result) => result.status === 'already-migrated')
        .every((result) => result.file && result.folderId),
    ).toBe(true);
    expect(drive.mutations.filter((entry) => entry.type === 'move')).toHaveLength(3);
  });

  it('retries a partial run and leaves missing, wrong-folder and conflicting Docs untouched', async () => {
    const conflictTarget = `Test Wiedzy - ${WEDDING_ID}`;
    const drive = createFakeDrive({
      docs: [
        doc('doc-speech-ready', 'old speech', [OLD_FOLDER_ID]),
        doc('doc-speech-migrated', speechName.replace(' - 1 - ', ' - 2 - '), [SPEECHES_FOLDER_ID]),
        doc('doc-missing', 'unused', [OLD_FOLDER_ID]),
        doc('doc-wrong', 'wrong place', [OUTSIDE_FOLDER_ID]),
        doc('doc-conflict', 'old conflict', [OLD_FOLDER_ID]),
        doc('existing-target', conflictTarget, [GAMES_FOLDER_ID]),
      ],
    });
    const driveApi = connectorFor(drive);
    const speeches = [
      speech({ id: 'speech_ready', drive_doc_id: 'doc-speech-ready' }),
      speech({
        id: 'speech_migrated',
        sort_order: 2,
        speaker_name: 'Bartek',
        speaker_relationship: 'Best man',
        drive_doc_id: 'doc-speech-migrated',
      }),
      speech({ id: 'speech_missing', sort_order: 3, drive_doc_id: 'doc-does-not-exist' }),
      speech({ id: 'speech_wrong', sort_order: 4, drive_doc_id: 'doc-wrong' }),
    ];
    const gameDocs = [gameDoc({ drive_doc_id: 'doc-conflict' })];

    const plan = await buildDocMigrationPlan({
      weddingId: WEDDING_ID,
      weddingFolderId: WEDDING_FOLDER_ID,
      speeches,
      gameDocs,
      connector: driveApi,
    });
    const byId = new Map(plan.entries.map((entry) => [entry.id, entry]));
    expect(byId.get('speech_migrated').status).toBe('already-migrated');
    expect(byId.get('speech_missing').status).toBe('missing-file');
    expect(byId.get('speech_wrong').status).toBe('wrong-folder');
    expect(byId.get('TEST_WIEDZY').status).toBe('target-conflict');
    expect(plan.counts).toMatchObject({
      ready: 1,
      alreadyMigrated: 1,
      missingFiles: 1,
      wrongFolders: 1,
      conflicts: 1,
    });

    const execution = await executeDocMigration({ plan, connector: driveApi });
    expect(execution.summary).toMatchObject({ migrated: 1, failed: 0, conflicts: 1 });
    expect(drive.docs.get('doc-speech-migrated').name).toBe(
      speechName.replace(' - 1 - ', ' - 2 - '),
    );
    expect(drive.docs.get('doc-speech-missing')).toBeUndefined();
    expect(drive.docs.get('doc-wrong')).toMatchObject({
      name: 'wrong place',
      parents: [OUTSIDE_FOLDER_ID],
    });
    expect(drive.docs.get('doc-conflict')).toMatchObject({
      name: 'old conflict',
      parents: [OLD_FOLDER_ID],
    });
    expect(drive.docs.get('existing-target')).toMatchObject({
      name: conflictTarget,
      parents: [GAMES_FOLDER_ID],
    });
    expect(drive.docs.get('doc-speech-ready').name).toBe(speechName);

    // The next run is a clean no-op for the migrated Doc.
    const retry = await buildDocMigrationPlan({
      weddingId: WEDDING_ID,
      weddingFolderId: WEDDING_FOLDER_ID,
      speeches,
      gameDocs,
      connector: driveApi,
    });
    expect(retry.counts.ready).toBe(0);
    expect(retry.counts.alreadyMigrated).toBe(2);
  });

  it('reports invalid wedding ids without touching any Doc', async () => {
    const drive = createFakeDrive({ docs: [doc('doc-speech', 'old', [OLD_FOLDER_ID])] });
    const driveApi = connectorFor(drive);
    const plan = await buildDocMigrationPlan({
      weddingId: '2025-01-01_legacy_wedding',
      weddingFolderId: WEDDING_FOLDER_ID,
      speeches: [speech()],
      gameDocs: [],
      connector: driveApi,
    });
    expect(plan.weddingIdValid).toBe(false);
    expect(plan.entries[0].status).toBe('invalid-wedding-id');
    const execution = await executeDocMigration({ plan, connector: driveApi });
    expect(execution.summary.migrated).toBe(0);
    expect(drive.docs.get('doc-speech')).toMatchObject({
      name: 'old',
      parents: [OLD_FOLDER_ID],
    });
    expect(drive.mutations).toEqual([]);
  });

  it('moves a Doc by id without changing content or version history', async () => {
    const drive = createFakeDrive({
      docs: [doc('doc-speech', 'old speech', [OLD_FOLDER_ID])],
    });
    const driveApi = connectorFor(drive);
    const file = await driveApi.moveFile({
      fileId: 'doc-speech',
      parentId: SPEECHES_FOLDER_ID,
    });
    expect(file).toMatchObject({
      id: 'doc-speech',
      name: 'old speech',
      parents: [SPEECHES_FOLDER_ID],
      version: '3',
    });
    expect(drive.docs.get('doc-speech').mimeType).toBe(DRIVE_DOC_MIME_TYPE);
  });

  it('wires the owner preflight, confirmation and 90-day logs in the admin API', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain("action === 'preflight_doc_migration'");
    expect(api).toContain("action === 'migrate_docs'");
    expect(api).toContain('buildDocMigrationPlan');
    expect(api).toContain('executeDocMigration');
    expect(api).toContain("code: 'confirmation_required'");
    expect(api).toContain("code: 'invalid_wedding_id'");
    expect(api).toContain("writeAudit(admin, allowlisted, 'doc_migration'");
    expect(api).toContain('speech_doc_migration');
    expect(api).toContain('game_question_doc_migration');
    expect(api).not.toContain('updateGoogleDocText');
    const migrateHandler = api.slice(api.indexOf("action === 'migrate_docs'"));
    expect(migrateHandler).not.toContain('deleteFile');
    expect(migrateHandler).not.toContain('createGoogleDoc');
  });

  it('exposes the preflight, mutation and confirmation in the admin UI', () => {
    const panel = read('src/admin/AdminDocMigrationPanel.jsx');
    expect(panel).toContain('preflightDocMigration');
    expect(panel).toContain('migrateDocs');
    expect(panel).toContain('confirmed: true');
    expect(panel).toContain('never deleted, overwritten or content-modified');
    expect(panel).toContain('already migrated');
    expect(panel).toContain('target-conflict');
    const api = read('src/admin/adminApi.js');
    expect(api).toContain("callAdmin('preflight_doc_migration'");
    expect(api).toContain("callAdmin('migrate_docs'");
    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain("import AdminDocMigrationPanel from './AdminDocMigrationPanel'");
    expect(app).toContain('<AdminDocMigrationPanel');
  });
});
