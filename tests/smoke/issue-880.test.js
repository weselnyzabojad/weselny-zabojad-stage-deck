import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROLES, ROLE_ORDER, normalizeRole } from '../../src/lib/roles.js';
import {
  projectedRolesForPackage,
  vipAssignmentError,
} from '../../supabase/functions/_shared/adminPublish.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #880 DJ_MC combined role', () => {
  it('adds dj_mc as an owner-only combined role', () => {
    expect(ROLES.dj_mc).toMatchObject({
      id: 'dj_mc',
      view: 'dj_mc',
      providerCategory: 'dj_mc',
      joinable: true,
    });
    expect(ROLE_ORDER).toContain('dj_mc');
    expect(normalizeRole('dj_mc')).toBe('dj_mc');
  });

  it('projects exactly one dj_mc role for DJ_MC and removes it elsewhere', () => {
    expect(projectedRolesForPackage('DJ_MC', ['mc', 'dj'])).toEqual(['dj_mc']);
    expect(projectedRolesForPackage('DJ_MC', ['dj_mc'])).toEqual(['dj_mc']);
    expect(projectedRolesForPackage('HOST_AND_DJ_VIP', ['mc', 'dj', 'dj_mc'])).toEqual([
      'mc',
      'dj',
    ]);
  });

  it('keeps DJ_MC VIP-only for Mark/Szymoniak', () => {
    expect(vipAssignmentError({ servicePackage: 'DJ_MC', djIdentityId: 'dj_mark' })).toBeNull();
    expect(vipAssignmentError({ servicePackage: 'DJ_MC', djIdentityId: 'other' })).toContain(
      'DJ Mark or DJ Szymoniak',
    );
  });

  it('adds dj_mc to constraints, RLS and the projection function', () => {
    const migration = read('supabase/migrations/202611140002_dj_mc_role.sql');
    const schema = read('supabase/schema.sql');
    for (const sql of [migration, schema]) {
      expect(sql).toContain(
        "'mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker', 'dj_mc'",
      );
    }
    expect(migration).toContain('wedding_roles_role_check');
    expect(migration).toContain('role_sessions_role_check');
    expect(migration).toContain('role_presence_role_check');
    expect(migration).toContain("app_role not in ('mc', 'dj_mc')");
  });

  it('joins and provisions the combined role', () => {
    expect(read('supabase/functions/join_room/index.ts')).toContain("'speaker', 'dj_mc'");
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain('projectedRolesForPackage(');
    expect(api).toContain("weddingRow?.cartridge?.servicePackage");
  });

  it('renders the combined MC + DJ VIP view', () => {
    const deck = read('src/StageDeck.jsx');
    const mc = read('src/views/McMasterView.jsx');
    expect(deck).toContain("djMc: currentRole === 'dj_mc'");
    expect(deck).toContain('djMcAccessToken');
    expect(mc).toContain('{djMc ?');
    expect(mc).toContain('<DjSongRequestQueue');
    expect(mc).toContain('<MusicPolicyCard');
  });

  it('keeps QR, join and Open on phone role-driven', () => {
    expect(read('src/components/RoleJoinScreen.jsx')).toContain('JOINABLE_ROLE_IDS');
    expect(read('src/lib/openOnPhone.js')).toContain('JOINABLE_ROLE_IDS');
  });
});
