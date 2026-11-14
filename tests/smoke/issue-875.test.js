import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROLES, ROLE_ORDER, normalizeRole } from '../../src/lib/roles.js';
import { ROLE_IDS, validateRoles } from '../../src/admin/adminUtils.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');
const CANONICAL = ['mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker'];

describe('issue #875 canonical role catalog', () => {
  it('has exactly the seven canonical roles and no photo role', () => {
    expect(Object.keys(ROLES).sort()).toEqual([...CANONICAL].sort());
    expect(ROLE_ORDER).toEqual(CANONICAL);
    expect(ROLE_IDS).toEqual(CANONICAL);
    expect(validateRoles(['mc', 'photo', 'photo1', 'bogus'])).toEqual(['mc', 'photo1']);
  });

  it('keeps legacy photo values and stored roles normalized to photo1', () => {
    expect(normalizeRole('photo')).toBe('photo1');
    expect(normalizeRole('photo1')).toBe('photo1');
    expect(normalizeRole('unknown')).toBe('mc');
  });

  it('removes photo from every runtime join/publish list', () => {
    expect(read('src/components/RoleJoinScreen.jsx')).toContain(
      "const JOIN_ROLES = ['mc', 'dj', 'photo1', 'speaker'];",
    );
    expect(read('supabase/functions/_shared/adminPublish.js')).toContain(
      "export const ALLOWED_ROLES = ['mc', 'dj', 'speaker'];",
    );
    const join = read('supabase/functions/join_room/index.ts');
    expect(join).toContain("'photo1', 'photo2', 'video', 'venue_manager', 'speaker'");
    expect(join).not.toContain("'photo'");
  });

  it('removes dj_standard as a role id while package gating stays', () => {
    expect(read('src/lib/viewRoles.js')).not.toContain('dj_standard');
    expect(read('src/components/DevViewSwitcher.jsx')).not.toContain('dj_standard');
    const deck = read('src/StageDeck.jsx');
    expect(deck).not.toContain('dj_standard');
    expect(deck).toContain('servicePackage={djViewWedding.servicePackage}');
  });

  it('aligns schema, policies and the projection function with the canonical list', () => {
    const migration = read('supabase/migrations/202611140001_remove_legacy_photo_role.sql');
    const schema = read('supabase/schema.sql');
    const list = "'mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker'";

    for (const sql of [migration, schema]) {
      expect(sql).toContain(list);
      expect(sql).not.toContain("'photo', 'photo1'");
    }
    expect(migration).toContain('wedding_roles_role_check');
    expect(migration).toContain('role_sessions_role_check');
    expect(migration).toContain('role_presence_role_check');
    expect(migration).toContain('create or replace function public.stage_deck_wedding()');
    expect(migration).toContain('public.current_session_active()');
  });
});
