import { readFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGoogleDriveConnector } from '../supabase/functions/_shared/googleDrive.js';
import {
  findPermissionByEmail,
  isOwnerPermission,
  normalizeShareEmail,
  resolveSecretsWeddingId,
  sanitizeShareMessage,
} from '../supabase/functions/_shared/driveSharing.js';
import { MOCK_ROOT_FOLDER_ID, startMockDrive } from '../tools/google-drive-mock/server.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

async function child(connector, parentId, name) {
  const { files } = await connector.listChildren({ parentId });
  return files.find((file) => file.name === name);
}

describe('issue #982 private Drive sharing', () => {
  let mock;
  let connector;
  let speechDoc;

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

    const year = await child(connector, MOCK_ROOT_FOLDER_ID, '2026');
    const month = await child(connector, year.id, 'August');
    const secrets = await child(connector, month.id, 'secrets');
    const wedding = await child(connector, secrets.id, 'UM-2026-08-001');
    const speeches = await child(connector, wedding.id, 'speeches');
    const { files } = await connector.listChildren({
      parentId: speeches.id,
      mimeType: 'application/vnd.google-apps.document',
    });
    speechDoc = files[0];
  });

  afterAll(async () => {
    await mock.close();
  });

  it('lists the owner permission and shares a secrets Doc with a reader', async () => {
    const initial = await connector.listPermissions(speechDoc.id);
    expect(initial).toEqual([
      expect.objectContaining({ role: 'owner', emailAddress: 'drive-mock@stage-deck.local' }),
    ]);

    const shared = await connector.shareFile({
      fileId: speechDoc.id,
      email: 'Reader@Example.com',
      role: 'reader',
      notify: true,
    });
    expect(shared).toMatchObject({ role: 'reader', emailAddress: 'reader@example.com' });

    const after = await connector.listPermissions(speechDoc.id);
    expect(after.map((permission) => permission.emailAddress)).toContain('reader@example.com');
    expect(findPermissionByEmail(after, 'READER@example.com')?.id).toBe(shared.id);
  });

  it('revokes a reader but refuses the owner permission', async () => {
    const permissions = await connector.listPermissions(speechDoc.id);
    const reader = findPermissionByEmail(permissions, 'reader@example.com');
    await connector.deletePermission({ fileId: speechDoc.id, permissionId: reader.id });
    const after = await connector.listPermissions(speechDoc.id);
    expect(findPermissionByEmail(after, 'reader@example.com')).toBeNull();

    const owner = after.find(isOwnerPermission);
    await expect(
      connector.deletePermission({ fileId: speechDoc.id, permissionId: owner.id }),
    ).rejects.toMatchObject({ code: 'drive_permission_denied' });
  });

  it('rejects sharing a pre-existing, non-app-created file', async () => {
    const { files } = await connector.listFiles({ query: '' });
    const cartridge = files.find((file) => file.mimeType === 'application/json');
    await expect(
      connector.shareFile({ fileId: cartridge.id, email: 'reader@example.com' }),
    ).rejects.toMatchObject({ code: 'drive_permission_denied' });
  });

  it('resolves the private secrets ancestry and rejects customer files', async () => {
    const nodes = {
      doc: { id: 'doc', name: 'speech', mimeType: 'application/vnd.google-apps.document', parents: ['speeches'] },
      speeches: { id: 'speeches', name: 'speeches', mimeType: 'application/vnd.google-apps.folder', parents: ['wedding'] },
      wedding: { id: 'wedding', name: 'A&B-UM-2026-08-001', mimeType: 'application/vnd.google-apps.folder', parents: ['secrets'] },
      secrets: { id: 'secrets', name: 'secrets', mimeType: 'application/vnd.google-apps.folder', parents: ['month'] },
      month: { id: 'month', name: 'August', mimeType: 'application/vnd.google-apps.folder', parents: [] },
      customerDoc: { id: 'customer-doc', name: 'cartridge', mimeType: 'application/json', parents: ['games'] },
      games: { id: 'games', name: 'games', mimeType: 'application/vnd.google-apps.folder', parents: ['customer-wedding'] },
      'customer-wedding': { id: 'customer-wedding', name: 'B-UM-2026-08-002', mimeType: 'application/vnd.google-apps.folder', parents: ['month'] },
    };
    const getFileMetadata = async (id) => nodes[id];

    const privateResult = await resolveSecretsWeddingId({ fileId: 'doc', getFileMetadata });
    expect(privateResult).toMatchObject({ ok: true, weddingId: 'A&B-UM-2026-08-001' });

    const folderResult = await resolveSecretsWeddingId({
      fileId: 'month',
      getFileMetadata,
    });
    expect(folderResult.ok).toBe(false);
    expect(folderResult.code).toBe('drive_unsupported_type');

    const customerDoc = await resolveSecretsWeddingId({
      fileId: 'customerDoc',
      getFileMetadata,
    });
    expect(customerDoc.ok).toBe(false);
    expect(customerDoc.code).toBe('drive_share_outside_secrets');
  });

  it('validates emails, messages and owner checks', () => {
    expect(normalizeShareEmail('  A@B.CO ')).toBe('a@b.co');
    expect(normalizeShareEmail('not-an-email')).toBe('');
    expect(normalizeShareEmail('')).toBe('');
    expect(sanitizeShareMessage('x'.repeat(500))).toHaveLength(200);
    expect(isOwnerPermission({ role: 'owner' })).toBe(true);
    expect(isOwnerPermission({ role: 'reader' })).toBe(false);
  });

  it('wires the admin_drive actions, audit and mock permissions', () => {
    const handler = read('supabase/functions/admin_drive/index.ts');
    expect(handler).toContain("'list_permissions'");
    expect(handler).toContain("'share_file'");
    expect(handler).toContain("'revoke_permission'");
    expect(handler).toContain('admin_audit_log');
    expect(handler).toContain('drive_share');
    expect(handler).toContain('drive_unshare');
    expect(handler).toContain("role: 'reader'");

    const connectorSource = read('supabase/functions/_shared/googleDrive.js');
    expect(connectorSource).toContain('async function listPermissions');
    expect(connectorSource).toContain('async function shareFile');
    expect(connectorSource).toContain('async function deletePermission');

    const mockSource = read('tools/google-drive-mock/server.mjs');
    expect(mockSource).toContain('/permissions');
    expect(mockSource).toContain('insufficientFilePermissions');

    const docs = read('docs/admin-setup-and-secrets.md');
    expect(docs).toContain('drive.file');
  });
});
