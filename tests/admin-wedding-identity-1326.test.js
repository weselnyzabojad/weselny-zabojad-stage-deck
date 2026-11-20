import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AdminWeddingIdentityEditor from '../src/admin/AdminWeddingIdentityEditor.jsx';
import {
  TEMPLATE_PREREQUISITES,
  templateReadiness,
} from '../supabase/functions/_shared/templateReadiness.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const wedding = {
  wedding_id: 'W-UM-2026-08-001',
  bride_name: 'Aleksandra',
  groom_name: 'Michal',
  venue_name: 'Dwor Pod Lipami',
  venue_address: 'ul. Lipowa 12',
  archived_at: null,
};

function render(overrides = {}) {
  return renderToStaticMarkup(
    createElement(AdminWeddingIdentityEditor, { wedding, ...overrides }),
  );
}

describe('issue #1326 admin wedding identity for the client template', () => {
  it('adds nullable names with length checks and only safe couple backfill', () => {
    const migration = read('supabase/migrations/202611210001_wedding_identity_names.sql');

    expect(migration).toContain('add column if not exists bride_name text');
    expect(migration).toContain('add column if not exists groom_name text');
    expect(migration).toContain('char_length(bride_name) between 1 and 80');
    expect(migration).toContain('char_length(groom_name) between 1 and 80');
    expect(migration).toContain("array_length(string_to_array(couple, '&'), 1) = 2");
    expect(migration).toContain("split_part(couple, '&', 1)");
    expect(migration).toContain("split_part(couple, '&', 2)");
    expect(migration).toContain("nullif(btrim(split_part(couple, '&', 1)), '') is not null");
    expect(migration).toContain("nullif(btrim(split_part(couple, '&', 2)), '') is not null");
    expect(migration).not.toContain('folder_id');
  });

  it('reports the four prerequisites from one shared helper', () => {
    expect([...TEMPLATE_PREREQUISITES]).toEqual([
      'bride_name',
      'groom_name',
      'venue_name',
      'venue_address',
    ]);
    expect(templateReadiness(wedding)).toEqual({ ready: true, missing: [] });
    expect(templateReadiness({ ...wedding, groom_name: '   ' })).toEqual({
      ready: false,
      missing: ['groom_name'],
    });
    expect(templateReadiness({ ...wedding, venue_address: null, bride_name: undefined })).toEqual({
      ready: false,
      missing: ['bride_name', 'venue_address'],
    });
    expect(templateReadiness({})).toEqual({
      ready: false,
      missing: ['bride_name', 'groom_name', 'venue_name', 'venue_address'],
    });
  });

  it('renders both names, readiness and the disabled create action', () => {
    const ready = render({ onCreateTemplate: () => {} });
    expect(ready).toContain('Wedding identity');
    expect(ready).toContain('Bride first name');
    expect(ready).toContain('Groom first name');
    expect(ready).toContain('value="Aleksandra"');
    expect(ready).toContain('value="Michal"');
    expect(ready).toContain('Ready - Venue name');
    expect(ready).toContain('Create client template');

    const blocked = render({ wedding: { ...wedding, venue_address: '' } });
    expect(blocked).toContain('1 missing');
    expect(blocked).toContain('Missing - Venue address');
    expect(blocked).toContain('Fill the missing fields above');
    expect(blocked).toContain('disabled=""');

    const readOnly = render({ readOnly: true });
    expect(readOnly).toContain('Editing is disabled while the admin is read-only');
    expect(readOnly).toContain('disabled=""');
  });

  it('validates, trims and saves through the admin API', () => {
    const editor = read('src/admin/AdminWeddingIdentityEditor.jsx');
    expect(editor).toContain('updateWeddingIdentity({');
    expect(editor).toContain('weddingId: wedding?.wedding_id');
    expect(editor).toContain('brideName: bride');
    expect(editor).toContain('groomName: groom');
    expect(editor).toContain('Bride and groom first names are required.');
    expect(editor).toContain('Bride and groom names must be 80 characters or fewer.');
    expect(editor).toContain('const reset = () =>');
    expect(editor).toContain('Wedding names saved.');
    expect(editor).toContain('onSaved');

    const api = read('src/admin/adminApi.js');
    expect(api).toContain('export async function updateWeddingIdentity');
    expect(api).toContain("callAdmin('update_wedding_identity', payload)");
    expect(api).toContain("demoMutate('update_wedding_identity')");
  });

  it('validates and audits the server update action', () => {
    const backend = read('supabase/functions/admin_api/index.ts');
    expect(backend).toContain("if (action === 'update_wedding_identity')");
    expect(backend).toContain('Bride and groom first names are required.');
    expect(backend).toContain('Bride and groom names must be 80 characters or fewer.');
    expect(backend).toContain('bride_name: brideName');
    expect(backend).toContain('groom_name: groomName');
    expect(backend).toContain("writeAudit(admin, allowlisted, 'update_wedding_identity'");
    expect(backend).toContain('bride_name, groom_name');
    expect(backend).toContain('venue_name, venue_address');
    expect(backend).toMatch(/ARCHIVED_BLOCKED_ACTIONS[\s\S]*?'update_wedding_identity'/);
  });

  it('wires the editor into the admin wedding detail and demo data', () => {
    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain(
      "import AdminWeddingIdentityEditor from './AdminWeddingIdentityEditor';",
    );
    expect(app).toContain('<AdminWeddingIdentityEditor');
    expect(app).toContain('readOnly={readOnly || Boolean(wedding.archived_at)}');
    expect(app).toContain('onSaved={load}');

    const demo = read('src/admin/adminDemoApi.js');
    expect(demo).toContain('bride_name:');
    expect(demo).toContain('groom_name:');
  });
});
