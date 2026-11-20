import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { projectedRolesForPackage } from '../../supabase/functions/_shared/adminPublish.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');
const api = read('supabase/functions/admin_api/index.ts');
const schema = read('supabase/schema.sql');
const migration = read('supabase/migrations/202611140003_admin_role_provisioning.sql');

describe('issue #876 admin role management backend', () => {
  it('adds mc and dj_mc provider categories', () => {
    expect(api).toContain("'venue_manager', 'mc', 'dj_mc', 'other'");
    expect(api).toContain(
      "new Set(['dj', 'photo1', 'photo2', 'video', 'venue_manager', 'mc', 'dj_mc'])",
    );
    expect(api).toContain("category === 'dj_mc' && !requestedVipDjId");
    for (const sql of [schema, migration]) {
      expect(sql).toContain("'mc', 'dj_mc'");
    }
  });

  it('adds the MC confirmation state and backend action', () => {
    expect(schema).toContain('mc_confirmed_by');
    expect(migration).toContain('mc_confirmed_by');
    expect(api).toContain("action === 'confirm_mc'");
    expect(api).toContain("['OWNER', 'PROVIDER'].includes(mode)");
    expect(api).toContain('mc_confirmed_by: data.active ?');
  });

  it('exposes per-role listing and enable/remove actions', () => {
    for (const action of ['list_roles', 'set_role', 'remove_role']) {
      expect(api).toContain(`action === '${action}'`);
    }
    expect(api).toContain('providerManaged');
    expect(api).toContain('managed by an active provider');
    expect(api).toContain('Deactivate the provider before removing this role');
    expect(api).toContain("role_enable");
    expect(api).toContain("role_disable");
  });

  it('keeps package defaults for first publication and admin override after', () => {
    expect(projectedRolesForPackage('DJ_MC', ['mc', 'dj'])).toEqual(['dj_mc']);
    expect(api).toContain('projectedRolesForPackage(');
    expect(api).toContain('result.created');
    expect(api).toContain('initializeNewWedding');
  });

  it('exposes Song Requestor admin eligibility and link', () => {
    expect(api).toContain('songRequestEligible');
    expect(api).toContain('songRequestUrl');
    expect(api).toContain('/request/${row.room_code}');
  });

  it('renders the per-wedding roles panel with all actions', () => {
    const app = read('src/admin/AdminApp.jsx');
    const panel = read('src/admin/AdminWeddingRoles.jsx');
    expect(app).toContain('<AdminWeddingRoles');
    for (const action of ['listWeddingRoles', 'setWeddingRole', 'removeWeddingRole', 'confirmWeddingMc']) {
      expect(panel).toContain(action);
    }
    expect(panel).toContain('provider-managed');
    expect(panel).toContain('Deactivate the provider first.');
    expect(panel).toContain('MC = owner');
    expect(panel).toContain('MC = provider');
    expect(panel).toContain('Open Song Requestor');
    expect(panel).toContain('<AdminQrCards');
    expect(panel).toContain('ROLES[role]?.view');
  });
});
