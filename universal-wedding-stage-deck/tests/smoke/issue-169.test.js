import { generateKeyPairSync } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createGoogleDriveConnector,
  DRIVE_DOC_MIME_TYPE,
  DRIVE_JSON_MIME_TYPE,
  GOOGLE_TOKEN_ENDPOINT,
} from '../../supabase/functions/_shared/googleDrive.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

function response(status, body = null, { text = null, headers = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[String(name).toLowerCase()] ?? null },
    async json() {
      if (body == null) throw new Error('no json');
      return body;
    },
    async text() {
      if (text != null) return text;
      return JSON.stringify(body ?? '');
    },
  };
}

function tokenResponse() {
  return response(200, { access_token: 'token-169', expires_in: 3600 });
}

function metadata({ id, name, mimeType, size = '100' }) {
  return response(200, {
    id,
    name,
    mimeType,
    modifiedTime: '2026-11-06T10:00:00.000Z',
    version: '7',
    md5Checksum: `checksum-${id}`,
    size,
    owners: [{ emailAddress: 'private@example.com' }],
  });
}

function connector(fetchImpl, options = {}) {
  return createGoogleDriveConnector({
    clientEmail: 'service@example.iam.gserviceaccount.com',
    privateKey,
    fetchImpl,
    sleep: async () => {},
    ...options,
  });
}

describe('issue #169 Drive source listing', () => {
  it('lists only supported sources with pagination and metadata', async () => {
    let requestedUrl = '';
    const drive = connector(async (url) => {
      if (url === GOOGLE_TOKEN_ENDPOINT) return tokenResponse();
      requestedUrl = url;
      return response(200, {
        nextPageToken: 'page-2',
        files: [
          {
            id: 'file-json',
            name: 'wedding.json',
            mimeType: DRIVE_JSON_MIME_TYPE,
            modifiedTime: '2026-11-06T10:00:00.000Z',
            version: '7',
            md5Checksum: 'abc',
            size: '100',
          },
          {
            id: 'file-doc',
            name: 'Wedding plan',
            mimeType: DRIVE_DOC_MIME_TYPE,
            modifiedTime: '2026-11-06T11:00:00.000Z',
            version: '8',
            size: null,
          },
        ],
      });
    });

    const result = await drive.listFiles({
      query: "wedding's plan",
      pageToken: 'page-1',
      pageSize: 10,
    });

    const url = new URL(requestedUrl);
    expect(url.searchParams.get('pageSize')).toBe('10');
    expect(url.searchParams.get('pageToken')).toBe('page-1');
    expect(url.searchParams.get('q')).toContain('trashed = false');
    expect(url.searchParams.get('q')).toContain(`mimeType = '${DRIVE_JSON_MIME_TYPE}'`);
    expect(url.searchParams.get('q')).toContain(`mimeType = '${DRIVE_DOC_MIME_TYPE}'`);
    expect(url.searchParams.get('q')).toContain("name contains 'wedding\\'s plan'");
    expect(url.searchParams.get('fields')).toContain('nextPageToken');
    expect(result.nextPageToken).toBe('page-2');
    expect(result.files.map((file) => file.id)).toEqual(['file-json', 'file-doc']);
    expect(result.files[0].owners).toBeUndefined();
  });
});

describe('issue #169 source read and preview input', () => {
  it('reads JSON through files.get alt=media and preserves metadata', async () => {
    const cartridgeText = JSON.stringify({ weddingId: '2026-08-20_test_wedding', steps: [] });
    const drive = connector(async (url) => {
      if (url === GOOGLE_TOKEN_ENDPOINT) return tokenResponse();
      if (url.includes('?fields=')) {
        return metadata({ id: 'file-json', name: 'wedding.json', mimeType: DRIVE_JSON_MIME_TYPE });
      }
      expect(url).toContain('/file-json?alt=media');
      return response(200, null, { text: cartridgeText });
    });

    const source = await drive.readSource('file-json');
    expect(source).toMatchObject({
      kind: 'json',
      text: cartridgeText,
      file: { id: 'file-json', name: 'wedding.json', version: '7', md5Checksum: 'checksum-file-json' },
    });
    expect(source.bytes).toBeGreaterThan(0);
    expect(JSON.parse(source.text).weddingId).toBe('2026-08-20_test_wedding');
  });

  it('exports a native Google Doc as text/plain for the existing parser', async () => {
    const docText = '## EVENT\n\nKey: Value\n\n## TIMELINE\n\n| Step ID |\n| --- |\n| step_01 |';
    const drive = connector(async (url) => {
      if (url === GOOGLE_TOKEN_ENDPOINT) return tokenResponse();
      if (url.includes('?fields=')) {
        return metadata({ id: 'file-doc', name: 'Wedding plan', mimeType: DRIVE_DOC_MIME_TYPE });
      }
      expect(url).toContain('/file-doc/export?mimeType=text%2Fplain');
      return response(200, null, { text: docText });
    });

    const source = await drive.readSource('file-doc');
    expect(source.kind).toBe('google_doc');
    const parsed = parseGoogleDocTemplate(source.text);
    expect(parsed.byMarker.EVENT).toBeTruthy();
    expect(parsed.byMarker.TIMELINE).toBeTruthy();
  });

  it('fails safely for unsupported, oversized and malformed sources', async () => {
    const unsupported = connector(async (url) => {
      if (url === GOOGLE_TOKEN_ENDPOINT) return tokenResponse();
      return metadata({ id: 'file-txt', name: 'notes.txt', mimeType: 'text/plain' });
    });
    await expect(unsupported.readSource('file-txt')).rejects.toMatchObject({
      code: 'drive_unsupported_type',
    });

    const oversized = connector(async (url) => {
      if (url === GOOGLE_TOKEN_ENDPOINT) return tokenResponse();
      return metadata({
        id: 'file-big',
        name: 'big.json',
        mimeType: DRIVE_JSON_MIME_TYPE,
        size: '999999',
      });
    });
    await expect(oversized.readSource('file-big', { maxBytes: 100 })).rejects.toMatchObject({
      code: 'drive_file_too_large',
    });

    const malformed = connector(async (url) => {
      if (url === GOOGLE_TOKEN_ENDPOINT) return tokenResponse();
      if (url.includes('?fields=')) {
        return metadata({ id: 'file-bad', name: 'bad.json', mimeType: DRIVE_JSON_MIME_TYPE });
      }
      return response(200, null, { text: '{not json' });
    });
    await expect(malformed.readSource('file-bad')).rejects.toMatchObject({
      code: 'drive_malformed_source',
    });

    const emptyDoc = connector(async (url) => {
      if (url === GOOGLE_TOKEN_ENDPOINT) return tokenResponse();
      if (url.includes('?fields=')) {
        return metadata({ id: 'file-empty', name: 'Empty', mimeType: DRIVE_DOC_MIME_TYPE });
      }
      return response(200, null, { text: '   ' });
    });
    await expect(emptyDoc.readSource('file-empty')).rejects.toMatchObject({
      code: 'drive_malformed_source',
    });
  });

  it('maps list and preview API failures without exposing Google payloads', async () => {
    const drive = connector(async (url) => {
      if (url === GOOGLE_TOKEN_ENDPOINT) return tokenResponse();
      return response(404, { error: { message: 'raw upstream detail' } });
    });
    await expect(drive.listFiles()).rejects.toMatchObject({ code: 'drive_file_not_found' });
    try {
      await drive.listFiles();
    } catch (error) {
      expect(JSON.stringify(error)).not.toContain('raw upstream detail');
      expect(error.message).not.toContain('raw upstream detail');
    }
  });
});

describe('issue #169 admin-only UI wiring', () => {
  it('keeps Drive browse/preview on the admin surface only', () => {
    const api = read('src/admin/adminApi.js');
    expect(api).toContain("config.functionsUrl}/admin_drive");
    expect(api).toContain('export async function listDriveSources');
    expect(api).toContain('export async function previewDriveSource');

    const admin = read('src/admin/AdminApp.jsx');
    expect(admin).toContain('AdminDrivePanel');

    const panel = read('src/admin/AdminDrivePanel.jsx');
    expect(panel).toContain('listDriveSources');
    expect(panel).toContain('previewDriveSource');
    expect(panel).toContain('parseGoogleDocTemplate');
    expect(panel).toContain('validateCartridge');
    expect(panel).not.toContain('publishWedding');

    const roleFiles = [];
    const walk = (directory) => {
      const base = new URL(`../../${directory}/`, import.meta.url);
      for (const entry of readdirSync(base, { withFileTypes: true })) {
        const next = `${directory}/${entry.name}`;
        if (entry.name === 'admin') continue;
        if (entry.isDirectory()) walk(next);
        else if (/\.(js|jsx|ts)$/.test(entry.name)) roleFiles.push(next);
      }
    };
    walk('src');
    for (const file of roleFiles) {
      expect(read(file), file).not.toContain('admin_drive');
      expect(read(file), file).not.toContain('listDriveSources');
    }
  });

  it('adds list and preview actions to the admin_drive function', () => {
    const source = read('supabase/functions/admin_drive/index.ts');
    expect(source).toContain("'status', 'metadata', 'list', 'preview', 'check'");
    expect(source).toContain('connector.listFiles');
    expect(source).toContain('connector.readSource');
    expect(source).toContain('files: result.files');
    expect(source).toContain('kind: source.kind');
  });
});
