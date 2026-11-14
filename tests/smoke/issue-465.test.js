import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AdminServiceProviders from '../../src/admin/AdminServiceProviders.jsx';
import * as adminApi from '../../src/admin/adminApi.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #465 wedding service provider registry', () => {
  it('adds the admin-only table, constraints and indexes', () => {
    const migration = read('supabase/migrations/202611090002_wedding_service_providers.sql');
    const schema = read('supabase/schema.sql');
    for (const sql of [migration, schema]) {
      expect(sql).toContain('create table if not exists public.wedding_service_providers');
      expect(sql).toContain('wedding_service_providers_role_unique_idx');
      expect(sql).toContain('wedding_service_providers_other_function');
      expect(sql).toContain('revoke all on public.wedding_service_providers from anon, authenticated');
    }
    expect(schema).toContain("category in ('dj', 'photo1', 'photo2', 'video', 'venue_manager', 'mc', 'dj_mc', 'other')");
    expect(read('supabase/migrations/202611140003_admin_role_provisioning.sql')).toContain(
      "'venue_manager', 'mc', 'dj_mc'",
    );
  });

  it('implements validated, audited admin_api provider actions', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    for (const action of [
      'list_providers',
      'upsert_provider',
      'deactivate_provider',
      'delete_provider',
    ]) {
      expect(api).toContain(`action === '${action}'`);
    }
    expect(api).toContain('requireWritableWedding');
    expect(api).toContain('Archived weddings are read-only.');
    expect(api).toContain('assertProviderCategoryFree');
    expect(api).toContain('A function label is required for Other providers.');
    expect(api).toContain("'provider_upsert'");
    expect(api).toContain("'provider_deactivate'");
    expect(api).toContain("'provider_delete'");
    expect(api).toContain('before,');
    expect(api).toContain('after: data');
  });

  it('exposes provider client calls', () => {
    for (const name of ['listProviders', 'upsertProvider', 'deactivateProvider', 'deleteProvider']) {
      expect(typeof adminApi[name]).toBe('function');
    }
    const client = read('src/admin/adminApi.js');
    expect(client).toContain("callAdmin('list_providers'");
    expect(client).toContain("callAdmin('upsert_provider'");
    expect(client).toContain("callAdmin('deactivate_provider'");
    expect(client).toContain("callAdmin('delete_provider'");
  });

  it('renders the per-wedding provider panel with category and function validation', () => {
    const html = renderToStaticMarkup(
      createElement(AdminServiceProviders, {
        wedding: { wedding_id: '2026-08-20_test' },
      }),
    );
    expect(html).toContain('Service providers');
    const source = read('src/admin/AdminServiceProviders.jsx');
    expect(source).toContain('A function label is required for Other providers.');
    expect(source).toContain('First and last name are required.');
    expect(source).toContain('Deactivate');
    expect(source).toContain('Delete');
    expect(source).toContain('readOnly');
    for (const category of ['dj', 'photo1', 'photo2', 'video', 'venue_manager', 'mc', 'dj_mc', 'other']) {
      expect(source).toContain(`['${category}',`);
    }
  });

  it('mounts the panel in AdminApp and keeps archived weddings read-only', () => {
    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain('<AdminServiceProviders');
    expect(app).toContain('readOnly={readOnly || Boolean(wedding.archived_at)}');
  });

  it('does not add a stage-view vendor directory', () => {
    for (const file of [
      'src/views/McMasterView.jsx',
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/VenueManagerView.jsx',
      'src/components/SpeakerView.jsx',
    ]) {
      expect(read(file), file).not.toContain('Service providers');
    }
  });
});
