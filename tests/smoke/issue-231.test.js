import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROLE_IDS } from '../../src/admin/adminUtils.js';
import { MEDIA_ROLE_IDS, ROLE_ORDER, isMediaRole, normalizeRole } from '../../src/lib/roles.js';
import { resolveBaseRole } from '../../src/lib/viewRoles.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #231 separate media roles', () => {
  it('defines Photographer 1, Photographer 2 and Cameraman', () => {
    expect(MEDIA_ROLE_IDS).toEqual(['photo1', 'photo2', 'video']);
    expect(ROLE_ORDER).toEqual(['mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker', 'dj_mc']);
    for (const role of MEDIA_ROLE_IDS) expect(isMediaRole(role)).toBe(true);
  });

  it('maps the legacy photo role to Photographer 1', () => {
    expect(normalizeRole('photo')).toBe('photo1');
    expect(resolveBaseRole({
      isProduction: true,
      roleSessionRole: 'photo',
      role: 'mc',
      availableRoles: ROLE_ORDER,
    })).toBe('photo1');
  });

  it('updates admin roles and join allowed roles', () => {
    expect(ROLE_IDS).toEqual(ROLE_ORDER);
    expect(read('supabase/functions/join_room/index.ts')).toContain("'photo1', 'photo2', 'video'");
  });

  it('renders the Photographer view for every media role', () => {
    expect(read('src/StageDeck.jsx')).toContain('isMediaRole(currentRole)');
  });
});
