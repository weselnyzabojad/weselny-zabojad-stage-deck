import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  isOwnerPermission,
  isShareableSecretFile,
  permissionLabel,
  shareErrorMessage,
  validateShareEmail,
} from '../src/admin/adminSharing.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const DOC = 'application/vnd.google-apps.document';

describe('issue #981 private sharing UI', () => {
  it('offers sharing only for Docs and cartridge JSON, never folders', () => {
    expect(isShareableSecretFile({ mimeType: DOC })).toBe(true);
    expect(isShareableSecretFile({ mimeType: 'application/json' })).toBe(true);
    expect(isShareableSecretFile({ mimeType: 'application/vnd.google-apps.folder' })).toBe(false);
    expect(isShareableSecretFile({ mimeType: 'application/pdf' })).toBe(false);
    expect(isShareableSecretFile(null)).toBe(false);
  });

  it('validates recipient emails and labels permissions', () => {
    expect(validateShareEmail(' reader@example.com ')).toBe(true);
    expect(validateShareEmail('not-an-email')).toBe(false);
    expect(validateShareEmail('')).toBe(false);
    expect(permissionLabel({ emailAddress: 'a@b.co', displayName: 'A' })).toBe('a@b.co');
    expect(permissionLabel({ displayName: 'Guest' })).toBe('Guest');
    expect(permissionLabel({ id: 'perm-1' })).toBe('perm-1');
    expect(isOwnerPermission({ role: 'owner' })).toBe(true);
    expect(isOwnerPermission({ role: 'reader' })).toBe(false);
  });

  it('maps backend sharing errors to actionable text', () => {
    expect(shareErrorMessage({ code: 'drive_share_not_app_created' })).toContain(
      'created by the Stage Deck service account',
    );
    expect(shareErrorMessage({ code: 'drive_share_outside_secrets' })).toContain(
      'secrets/<weddingId>/',
    );
    expect(shareErrorMessage({ code: 'drive_owner_permission' })).toContain('owner');
    expect(shareErrorMessage({ status: 403 })).toContain('denied');
    expect(shareErrorMessage({ status: 404 })).toContain('no longer exists');
    expect(shareErrorMessage({ message: 'Boom' })).toBe('Boom');
  });

  it('adds adminApi wrappers for the permission actions', () => {
    const api = read('src/admin/adminApi.js');
    expect(api).toContain("callAdminDrive('list_permissions'");
    expect(api).toContain("callAdminDrive('share_file'");
    expect(api).toContain("callAdminDrive('revoke_permission'");
  });

  it('lists only files collected below the wedding secrets folder', () => {
    const folders = read('src/admin/AdminWeddingFolders.jsx');
    expect(folders).toContain('export default function AdminWeddingFolders({ readOnly = false })');
    expect(folders).toContain('isShareableSecretFile');
    expect(folders).toContain('wedding.secretFolder.id');
    expect(folders).toContain('AdminShareFileDialog');
    expect(folders).toContain('disabled={readOnly}');
    expect(folders).toContain('Share');
    expect(read('src/admin/AdminApp.jsx')).toContain(
      '<AdminWeddingFolders readOnly={readOnly} />',
    );
  });

  it('renders an accessible add/remove dialog with the privacy warning', () => {
    const dialog = read('src/admin/AdminShareFileDialog.jsx');
    expect(dialog).toContain('role="dialog"');
    expect(dialog).toContain('aria-modal="true"');
    expect(dialog).toContain('aria-describedby="share-file-warning"');
    expect(dialog).toContain('Speech scripts and game questions are private');
    expect(dialog).toContain('read-only access');
    expect(dialog).toContain('listDrivePermissions');
    expect(dialog).toContain('shareDriveFile');
    expect(dialog).toContain('revokeDrivePermission');
    expect(dialog).toContain('Confirm remove');
    expect(dialog).toContain('Send Google Drive notification email');
    expect(dialog).toContain('disabled={readOnly || busy}');
    expect(dialog).toContain("event.key === 'Escape'");
    expect(dialog).toContain('headingRef.current?.focus()');
    expect(dialog).toContain("role=\"alert\"");
  });
});
