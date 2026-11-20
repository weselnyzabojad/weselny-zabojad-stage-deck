import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLIENT_TEMPLATE_MARKDOWN } from '../supabase/functions/_shared/clientTemplateSource.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1327 Drive HTML import for the client template', () => {
  const drive = read('supabase/functions/_shared/googleDrive.js');
  const adminDrive = read('supabase/functions/admin_drive/index.ts');
  const migration = read('supabase/migrations/202611210002_wedding_template_doc.sql');

  it('keeps the embedded edge template byte-identical to the markdown reference', () => {
    expect(CLIENT_TEMPLATE_MARKDOWN).toBe(read('schema/google-doc-template.md'));
  });

  it('imports HTML through the multipart Drive upload shape', () => {
    expect(drive).toContain('async function createGoogleDocFromHtml({ parentId, name, html })');
    expect(drive).toContain('uploadType=multipart');
    expect(drive).toContain('text/html; charset=UTF-8');
    expect(drive).toContain('mimeType: DRIVE_DOC_MIME_TYPE');
    expect(drive).toContain('sanitizedMetadata(await readJson(response))');
    expect(drive).toContain('createGoogleDocFromHtml,');
    expect(drive).toContain('async function createGoogleDoc({ parentId, name, text })');
  });

  it('adds the nullable template_doc_id create-once guard', () => {
    expect(migration).toContain('add column if not exists template_doc_id text');
  });

  it('validates the admin session, writable wedding and prerequisites before Drive', () => {
    expect(adminDrive).toContain("'create_wedding_template_doc'");
    expect(adminDrive).toContain('templateReadiness(wedding)');
    expect(adminDrive).toContain('template_prerequisites_missing');
    expect(adminDrive).toContain('missing: readiness.missing');
    expect(adminDrive).toContain('Archived weddings are read-only.');
    expect(adminDrive.indexOf('templateReadiness(wedding)')).toBeLessThan(
      adminDrive.indexOf('connector.listChildren({', adminDrive.indexOf("action === 'create_wedding_template_doc'")),
    );
    expect(adminDrive.indexOf('templateReadiness(wedding)')).toBeLessThan(
      adminDrive.indexOf('connector.createGoogleDocFromHtml'),
    );
  });

  it('uses the exact filename, create-once guard and by-name second guard', () => {
    expect(adminDrive).toContain(
      '`Wedding harmonogram - ${clean(brideName)} & ${clean(groomName)} (${clean(weddingId)})`',
    );
    expect(adminDrive).toContain('.slice(0, 180)');
    expect(adminDrive).toContain('if (wedding.template_doc_id)');
    expect(adminDrive).toContain('code: \'template_doc_exists\'');
    expect(adminDrive).toContain('const existing = await connector.listChildren({');
    expect(adminDrive.indexOf('wedding.template_doc_id')).toBeLessThan(
      adminDrive.indexOf('connector.createGoogleDocFromHtml'),
    );
  });

  it('stores the created Doc and audits the file, name and folder', () => {
    expect(adminDrive).toContain('template_doc_id: file.id');
    expect(adminDrive).toContain("'create_wedding_template_doc'");
    expect(adminDrive).toContain('folderId: weddingFolderId');
    expect(adminDrive).toContain('id: file.id');
    expect(adminDrive).toContain('renderClientTemplateHtml({');
  });

  it('returns a clear folder error and never renders without prerequisites', () => {
    expect(adminDrive).toContain('code: \'missing_wedding_folder\'');
    expect(adminDrive).toContain('The wedding Drive folder could not be resolved.');
    expect(adminDrive).toContain("'template_prerequisites_missing'");
    expect(adminDrive).toContain('return json(');
  });
});
