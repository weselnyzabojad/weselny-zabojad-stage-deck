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
  GAME_TYPES,
  gameQuestionDocFileName,
  gameQuestionDocFolderPath,
} from '../supabase/functions/_shared/gameQuestions.js';
import { speechDocFilename } from '../supabase/functions/_shared/speechDoc.js';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const WEDDING_ID = 'Weronika&Guillaume-UM-2027-04-002';const WEDDING_FOLDER_ID = 'wedding-folder';
const MONTH_FOLDER_ID = 'month-2027-04';
const YEAR_FOLDER_ID = 'year-2027';

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

// Minimal in-memory Drive. The only pre-existing folders are the year, month and
// customer-visible wedding folder; every secret folder is created on demand.
function createFakeDrive() {
  const folders = new Map([
    [YEAR_FOLDER_ID, folder(YEAR_FOLDER_ID, '2027', [])],
    [MONTH_FOLDER_ID, folder(MONTH_FOLDER_ID, 'April', [YEAR_FOLDER_ID])],
    [WEDDING_FOLDER_ID, folder(WEDDING_FOLDER_ID, WEDDING_ID, [MONTH_FOLDER_ID])],
  ]);
  const docs = new Map();
  let sequence = 0;

  const copy = (file) => JSON.parse(JSON.stringify(file));

  async function fetchImpl(url, options = {}) {
    if (url === GOOGLE_TOKEN_ENDPOINT) {
      return jsonResponse(200, { access_token: 'token-968', expires_in: 3600 });
    }
    const parsed = new URL(url);
    const method = options.method ?? 'GET';

    if (url.includes('/upload/drive/v3/files')) {
      const body = String(options.body ?? '');
      const metadata = JSON.parse(body.split('\r\n\r\n')[1].split('\r\n--')[0]);
      const file = {
        id: `doc-${(sequence += 1)}`,
        name: metadata.name,
        mimeType: metadata.mimeType,
        parents: metadata.parents,
        version: '1',
        modifiedTime: '2026-11-15T10:00:00.000Z',
      };
      docs.set(file.id, file);
      return jsonResponse(200, copy(file));
    }

    if (method === 'POST') {
      const body = JSON.parse(options.body);
      const created = folder(`folder-${(sequence += 1)}`, body.name, body.parents);
      folders.set(created.id, created);
      return jsonResponse(200, copy(created));
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
      const files = [...folders.values()].filter(
        (entry) =>
          entry.parents.includes(parentId) &&
          (!name || entry.name === name) &&
          (!mimeType || entry.mimeType === mimeType),
      );
      return jsonResponse(200, { files: files.map(copy) });
    }

    throw new Error(`Unexpected Drive request: ${method} ${url}`);
  }

  return { folders, docs, fetchImpl };
}

function connectorFor(drive) {
  return createGoogleDriveConnector({
    clientEmail: 'service@example.iam.gserviceaccount.com',
    privateKey,
    fetchImpl: drive.fetchImpl,
    sleep: async () => {},
  });
}

function pathOf(folders, folderId) {
  const names = [];
  let current = folders.get(folderId);
  while (current) {
    names.unshift(current.name);
    current = current.parents?.[0] ? folders.get(current.parents[0]) : null;
  }
  return names;
}

function createPath(drive) {
  return (scope, segments) => {
    let parent = scope === 'private' ? MONTH_FOLDER_ID : WEDDING_FOLDER_ID;
    for (const name of segments) {
      const match = [...drive.folders.values()].find(
        (entry) => entry.name === name && entry.parents.includes(parent),
      );
      if (!match) return null;
      parent = match.id;
    }
    return parent;
  };
}

describe('issue #968 private Drive secrets layout', () => {
  it('creates a speech Doc below month/secrets/<weddingId>/speeches from only the wedding folder', async () => {
    const drive = createFakeDrive();
    const driveApi = connectorFor(drive);
    const resolve = createPath(drive);

    const { folder } = await driveApi.ensureSpeechFolder({
      weddingFolderId: WEDDING_FOLDER_ID,
      weddingId: WEDDING_ID,
    });
    const name = speechDocFilename({
      weddingId: WEDDING_ID,
      order: 1,
      speakerName: 'Bartek',
      relationship: 'Best man',
    });
    const file = await driveApi.createGoogleDoc({
      parentId: folder.id,
      name,
      text: 'SPEAKER [PL]',
    });

    expect(name).toBe(`${WEDDING_ID} - 1 - Bartek - Best man`);
    expect(pathOf(drive.folders, file.parents[0])).toEqual([
      '2027',
      'April',
      'secrets',
      WEDDING_ID,
      'speeches',
    ]);
    expect(drive.docs.get(file.id).mimeType).toBe(DRIVE_DOC_MIME_TYPE);
    expect(resolve('private', ['secrets', WEDDING_ID, 'speeches'])).toBe(folder.id);
    expect(
      [...drive.folders.values()].some(
        (entry) => entry.name === 'secrets' && entry.parents.includes(WEDDING_FOLDER_ID),
      ),
    ).toBe(false);
  });

  it('creates Test Zgodności below month/secrets/<weddingId>/compatibility-test-game', async () => {
    const drive = createFakeDrive();
    const driveApi = connectorFor(drive);
    const path = gameQuestionDocFolderPath(GAME_TYPES.TEST_ZGODNOSCI, WEDDING_ID);

    const { folder } = await driveApi.ensureFolderPath({
      weddingFolderId: WEDDING_FOLDER_ID,
      segments: path.segments,
      scope: path.scope,
    });
    const file = await driveApi.createGoogleDoc({
      parentId: folder.id,
      name: gameQuestionDocFileName(GAME_TYPES.TEST_ZGODNOSCI, WEDDING_ID),
      text: '| Question ID | Question PL |',
    });

    expect(path).toEqual({
      scope: 'private',
      segments: ['secrets', WEDDING_ID, 'compatibility-test-game'],
    });
    expect(pathOf(drive.folders, file.parents[0])).toEqual([
      '2027',
      'April',
      'secrets',
      WEDDING_ID,
      'compatibility-test-game',
    ]);
    expect(file.name).toBe(`Test Zgodności - ${WEDDING_ID}`);
    expect(
      [...drive.folders.values()].some(
        (entry) => entry.name === 'secrets' && entry.parents.includes(WEDDING_FOLDER_ID),
      ),
    ).toBe(false);
  });

  it('creates Test Wiedzy in the customer-visible wedding games folder', async () => {
    const drive = createFakeDrive();
    const driveApi = connectorFor(drive);
    const path = gameQuestionDocFolderPath(GAME_TYPES.TEST_WIEDZY, WEDDING_ID);

    const { folder } = await driveApi.ensureFolderPath({
      weddingFolderId: WEDDING_FOLDER_ID,
      segments: path.segments,
      scope: path.scope,
    });
    const file = await driveApi.createGoogleDoc({
      parentId: folder.id,
      name: gameQuestionDocFileName(GAME_TYPES.TEST_WIEDZY, WEDDING_ID),
      text: '| Question ID | Question PL | Level | Answer |',
    });

    expect(path).toEqual({ scope: 'wedding', segments: ['games'] });
    expect(pathOf(drive.folders, file.parents[0])).toEqual([
      '2027',
      'April',
      WEDDING_ID,
      'games',
    ]);
    expect(file.name).toBe(`Test Wiedzy - ${WEDDING_ID}`);
  });

  it('reuses existing secret folders instead of duplicating them', async () => {
    const drive = createFakeDrive();
    const driveApi = connectorFor(drive);

    const first = await driveApi.ensureSpeechFolder({
      weddingFolderId: WEDDING_FOLDER_ID,
      weddingId: WEDDING_ID,
    });
    const folderCountAfterFirst = drive.folders.size;
    const second = await driveApi.ensureSpeechFolder({
      weddingFolderId: WEDDING_FOLDER_ID,
      weddingId: WEDDING_ID,
    });
    expect(second.folder.id).toBe(first.folder.id);
    expect(drive.folders.size).toBe(folderCountAfterFirst);
    expect(first.folders.map((entry) => entry.name)).toEqual([
      'secrets',
      WEDDING_ID,
      'speeches',
    ]);

    const gamePath = gameQuestionDocFolderPath(GAME_TYPES.TEST_ZGODNOSCI, WEDDING_ID);
    const firstGame = await driveApi.ensureFolderPath({
      weddingFolderId: WEDDING_FOLDER_ID,
      segments: gamePath.segments,
      scope: gamePath.scope,
    });
    const folderCountAfterGame = drive.folders.size;
    const secondGame = await driveApi.ensureFolderPath({
      weddingFolderId: WEDDING_FOLDER_ID,
      segments: gamePath.segments,
      scope: gamePath.scope,
    });

    expect(secondGame.folder.id).toBe(firstGame.folder.id);
    expect(drive.folders.size).toBe(folderCountAfterGame);
    expect(firstGame.folders.map((entry) => entry.name)).toEqual([
      'secrets',
      WEDDING_ID,
      'compatibility-test-game',
    ]);
  });

  it('rejects secrets paths under the wedding folder and malformed private paths', async () => {
    const drive = createFakeDrive();
    const driveApi = connectorFor(drive);
    const before = drive.folders.size;

    await expect(
      driveApi.ensureFolderPath({
        weddingFolderId: WEDDING_FOLDER_ID,
        segments: ['secrets', 'speeches'],
        scope: 'wedding',
      }),
    ).rejects.toMatchObject({ code: 'drive_invalid_request' });
    await expect(
      driveApi.ensureFolderPath({
        weddingFolderId: WEDDING_FOLDER_ID,
        segments: [WEDDING_ID, 'speeches'],
        scope: 'private',
      }),
    ).rejects.toMatchObject({ code: 'drive_invalid_request' });
    await expect(
      driveApi.ensureSpeechFolder({ weddingFolderId: WEDDING_FOLDER_ID }),
    ).rejects.toMatchObject({ code: 'drive_invalid_request' });

    expect(drive.folders.size).toBe(before);
  });

  it('wires admin_drive to the shared layout and wedding-id filenames', () => {
    const api = readFileSync(
      new URL('../supabase/functions/admin_drive/index.ts', import.meta.url),
      'utf8',
    );
    expect(api).toContain('weddingFolderId: resolvedWeddingFolderId,');
    expect(api).toContain('speechDocFilename({ weddingId, order, speakerName, relationship })');
    expect(api).toContain('gameQuestionDocFolderPath(gameType, weddingId)');
    expect(api).toContain('scope: path.scope');
  });
});
