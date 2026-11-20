import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AdminWeddingIdentityEditor from '../src/admin/AdminWeddingIdentityEditor.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const wedding = {
  wedding_id: 'W-UM-2026-08-001',
  bride_name: 'Aleksandra',
  groom_name: 'Michal',
  venue_name: 'Dwor Pod Lipami',
  venue_address: 'ul. Lipowa 12',
  template_doc_id: null,
  archived_at: null,
};

const render = (overrides = {}) =>
  renderToStaticMarkup(
    createElement(AdminWeddingIdentityEditor, { wedding, ...overrides }),
  );

describe('issue #1328 admin create client template action', () => {
  it('wraps the Drive action and carries conflict details', () => {
    const api = read('src/admin/adminApi.js');
    expect(api).toContain('export async function createWeddingTemplateDoc');
    expect(api).toContain("callAdminDrive('create_wedding_template_doc', payload)");
    expect(api).toContain('error.missing = Array.isArray(data?.missing)');
    expect(api).toContain('error.fileId = data?.fileId ?? null');
  });

  it('requires a one-time confirmation and shows a busy state', () => {
    const editor = read('src/admin/AdminWeddingIdentityEditor.jsx');
    expect(editor).toContain('window.confirm(');
    expect(editor).toContain('It can only be created once and cannot be overwritten.');
    expect(editor).toContain('Creation happens once.');
    expect(editor).toContain('Creating client template...');
    expect(editor).toContain('!createBusy');
  });

  it('renders the readiness list and disables the action when not ready', () => {
    const html = render({ wedding: { ...wedding, venue_address: '' } });
    expect(html).toContain('1 missing');
    expect(html).toContain('Missing - Venue address');
    expect(html).toContain('Create client template');
    expect(html).toContain('disabled=""');
  });

  it('enables the action for a ready wedding and respects read-only state', () => {
    const ready = render();
    expect(ready).toContain('Ready - Venue address');
    expect(ready).toContain('Create client template');
    expect(ready).not.toContain('Fill the missing fields above');
    expect(ready).not.toContain('disabled=""');

    const readOnly = render({ readOnly: true });
    expect(readOnly).toContain('Editing is disabled while the admin is read-only');
    expect(readOnly).toContain('disabled=""');
  });

  it('renders the created Doc link when template_doc_id is present', () => {
    const html = render({
      wedding: { ...wedding, template_doc_id: 'drive-doc-123' },
    });
    expect(html).toContain('Client template created.');
    expect(html).toContain('https://docs.google.com/document/d/drive-doc-123/edit');
    expect(html).toContain('disabled=""');
  });

  it('renders missing-prerequisite and already-created conflicts from the server', () => {
    const editor = read('src/admin/AdminWeddingIdentityEditor.jsx');
    expect(editor).toContain("createError.code === 'template_prerequisites_missing'");
    expect(editor).toContain('createError.missing.map');
    expect(editor).toContain("createError.code === 'template_doc_exists'");
    expect(editor).toContain('Open the existing client template');
    expect(editor).toContain('createError.message');
    expect(editor).not.toContain('access_token');
    expect(editor).not.toContain('raw request');
  });

  it('calls the action with the wedding and folder ids', () => {
    const editor = read('src/admin/AdminWeddingIdentityEditor.jsx');
    expect(editor).toContain('await createWeddingTemplateDoc({');
    expect(editor).toContain('weddingId: wedding?.wedding_id');
    expect(editor).toContain('weddingFolderId: wedding?.drive_folder_id');
    expect(editor).toContain('await onSaved()');
  });
});
