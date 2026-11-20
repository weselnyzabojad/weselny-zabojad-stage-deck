import { generateKeyPairSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createGoogleDriveConnector,
  DRIVE_DOC_MIME_TYPE,
} from '../supabase/functions/_shared/googleDrive.js';
import {
  DRIVE_FOLDER_MIME_TYPE,
  MOCK_ROOT_FOLDER_ID,
  MOCK_WEDDING_FOLDER,
  MOCK_WEDDING_ID,
  startMockDrive,
} from '../tools/google-drive-mock/server.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

describe('dockerized Google Drive mock', () => {
  let mock;
  let connector;

  beforeAll(async () => {
    mock = await startMockDrive({
      port: 0,
      cartridge: read('schema/wedding-cartridge.example.json'),
    });
    connector = createGoogleDriveConnector({
      clientEmail: 'mock@stage-deck.local',
      privateKey,
      apiBase: mock.url,
      maxRetries: 0,
      baseDelayMs: 1,
    });
  });

  afterAll(async () => {
    await mock.close();
  });

  it('seeds the wedding tree and resolves the private secrets sibling', async () => {
    const years = await connector.listChildren({ parentId: MOCK_ROOT_FOLDER_ID });
    expect(years.files.map((file) => file.name)).toContain('2026');

    const months = await connector.listChildren({ parentId: years.files[0].id });
    const month = months.files.find((file) => file.name === 'August');
    expect(month).toBeTruthy();

    const siblings = await connector.listChildren({ parentId: month.id });
    const names = siblings.files.map((file) => file.name);
    expect(names).toContain(MOCK_WEDDING_FOLDER);
    expect(names).toContain('secrets');

    const wedding = siblings.files.find((file) => file.name === MOCK_WEDDING_FOLDER);
    expect(await connector.resolveMonthFolderId(wedding.id)).toBe(month.id);
    expect(await connector.ensureSpeechFolder({ weddingFolderId: wedding.id, weddingId: MOCK_WEDDING_ID }))
      .toMatchObject({ folder: { name: 'speeches', mimeType: DRIVE_FOLDER_MIME_TYPE } });
  });

  it('serves the cartridge JSON through the Drive source API', async () => {
    const { files } = await connector.listFiles({ query: '' });
    const cartridge = files.find((file) => file.mimeType === 'application/json');
    expect(cartridge).toBeTruthy();

    const source = await connector.readSource(cartridge.id);
    expect(source.kind).toBe('json');
    expect(JSON.parse(source.text).weddingId).toBe(MOCK_WEDDING_ID);
  });

  it('creates, rewrites, renames and moves a Google Doc', async () => {
    const years = await connector.listChildren({ parentId: MOCK_ROOT_FOLDER_ID });
    const months = await connector.listChildren({ parentId: years.files[0].id });
    const month = months.files.find((file) => file.name === 'August');
    const siblings = await connector.listChildren({ parentId: month.id });
    const wedding = siblings.files.find((file) => file.name === MOCK_WEDDING_FOLDER);

    const { folder } = await connector.ensureFolderPath({
      weddingFolderId: wedding.id,
      segments: ['games'],
    });
    const doc = await connector.createGoogleDoc({
      parentId: folder.id,
      name: 'Mock Doc',
      text: 'first version',
    });
    expect(doc.mimeType).toBe(DRIVE_DOC_MIME_TYPE);

    const source = await connector.readSource(doc.id);
    expect(source.kind).toBe('google_doc');
    expect(source.text).toBe('first version');

    await connector.updateGoogleDocText({ fileId: doc.id, text: 'second version' });
    expect((await connector.readSource(doc.id)).text).toBe('second version');

    const renamed = await connector.renameFile({ fileId: doc.id, name: 'Mock Doc renamed' });
    expect(renamed.name).toBe('Mock Doc renamed');

    const target = await connector.ensureFolderPath({
      weddingFolderId: wedding.id,
      segments: ['games', 'mock-target'],
    });
    const moved = await connector.moveFile({ fileId: doc.id, parentId: target.folder.id });
    expect(moved.parents).toEqual([target.folder.id]);
  });

  it('imports HTML as a native Google Doc', async () => {
    const years = await connector.listChildren({ parentId: MOCK_ROOT_FOLDER_ID });
    const months = await connector.listChildren({ parentId: years.files[0].id });
    const month = months.files.find((file) => file.name === 'August');
    const siblings = await connector.listChildren({ parentId: month.id });
    const wedding = siblings.files.find((file) => file.name === MOCK_WEDDING_FOLDER);
    const doc = await connector.createGoogleDocFromHtml({
      parentId: wedding.id,
      name: 'Wedding harmonogram - Anna & Piotr',
      html: '<h1>Anna &amp; Piotr</h1><h2>TIMELINE</h2>',
    });
    expect(doc.mimeType).toBe(DRIVE_DOC_MIME_TYPE);
    expect(doc.name).toBe('Wedding harmonogram - Anna & Piotr');
    expect((await connector.readSource(doc.id)).text).toContain('<h1>Anna &amp; Piotr</h1>');
  });

  it('rejects unauthenticated and unsupported Drive queries', async () => {
    const unauthenticated = await fetch(`${mock.url}/drive/v3/files`);
    expect(unauthenticated.status).toBe(401);
    expect((await unauthenticated.json()).error.errors[0].reason).toBe('authError');

    const unsupported = await fetch(
      `${mock.url}/drive/v3/files?q=${encodeURIComponent("name = 'x' or name = 'y'")}`,
      { headers: { Authorization: 'Bearer any-token' } },
    );
    expect(unsupported.status).toBe(400);
  });

  it('wires the mock through configuration rather than code changes', () => {
    for (const file of ['admin_api', 'admin_drive']) {
      const source = read(`supabase/functions/${file}/index.ts`);
      expect(source).toContain("apiBase: Deno.env.get('GOOGLE_DRIVE_API_BASE')");
    }
    const compose = read('docker-compose.local.yml');
    expect(compose).toContain('stage-deck-google-drive-mock');
    expect(compose).toContain('supabase_network_stage-deck');
    const local = read('scripts/local-supabase.mjs');
    expect(local).toContain('GOOGLE_DRIVE_API_BASE');
    expect(local).toContain('startLocalMocks');
  });
});
