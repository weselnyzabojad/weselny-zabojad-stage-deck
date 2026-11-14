import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  VIP_DJS,
  defaultVipDjId,
  isVipDjId,
  vipDjById,
} from '../../src/lib/vipDjs.js';
import {
  djDetailTier,
  resolveDjIdentityId,
} from '../../src/lib/importantSongs.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #467 hardcoded VIP DJ registry', () => {
  it('ships the two stable ids with placeholder contacts', () => {
    expect(VIP_DJS.map((dj) => dj.id)).toEqual(['dj_mark', 'dj_szymoniak']);
    expect(VIP_DJS.every((dj) => dj.tier === 'VIP')).toBe(true);
    expect(VIP_DJS.every((dj) => dj.phone === 'TODO_OWNER_PHONE')).toBe(true);
    expect(VIP_DJS.every((dj) => dj.instagram === 'TODO_OWNER_INSTAGRAM')).toBe(true);
    expect(isVipDjId('dj_mark')).toBe(true);
    expect(isVipDjId('DJ Mark')).toBe(false);
  });

  it('defaults the VIP/MC+DJ package to DJ Mark only', () => {
    expect(defaultVipDjId('HOST_AND_DJ_VIP')).toBe('dj_mark');
    expect(defaultVipDjId('MC_DJ')).toBe(null);
    expect(defaultVipDjId('HOST_AND_DJ_STANDARD')).toBe(null);
    expect(defaultVipDjId('HOST_ONLY')).toBe(null);
  });

  it('resolves the tier by stable identity id, not package or name', () => {
    expect(djDetailTier({ servicePackage: 'HOST_AND_DJ_VIP' })).toBe('vip');
    expect(djDetailTier({ servicePackage: 'HOST_AND_DJ_VIP', djIdentityId: 'dj_mark' })).toBe('vip');
    expect(djDetailTier({ servicePackage: 'HOST_AND_DJ_STANDARD', djIdentityId: 'dj_szymoniak' })).toBe('vip');
    expect(djDetailTier({ servicePackage: 'HOST_AND_DJ_VIP', djIdentityId: 'other_dj' })).toBe('standard');
    expect(djDetailTier({ servicePackage: 'HOST_AND_DJ_STANDARD' })).toBe('standard');
    expect(djDetailTier({ servicePackage: 'HOST_ONLY' })).toBe('standard');
  });

  it('reads the assignment reference from the supported shapes', () => {
    expect(resolveDjIdentityId({ djIdentityId: 'dj_mark' })).toBe('dj_mark');
    expect(resolveDjIdentityId({ dj: { identityId: 'dj_szymoniak' } })).toBe('dj_szymoniak');
    expect(resolveDjIdentityId({ providers: { dj: { vipDjId: 'dj_mark' } } })).toBe('dj_mark');
    expect(resolveDjIdentityId({})).toBe(null);
  });

  it('resolves only an exact stable id', () => {
    expect(vipDjById('dj_mark')?.displayName).toBe('DJ Mark');
    expect(vipDjById('DJ Mark')).toBe(null);
  });

  it('keeps the registry read-only in admin and stores only the assignment', () => {
    const panel = read('src/admin/AdminServiceProviders.jsx');
    expect(panel).toContain('VIP DJ registry · read-only');
    expect(panel).toContain('VIP_DJS.map');
    expect(panel).toContain('VIP DJ identity');
    expect(panel).toContain('vipDjId');
    expect(panel).not.toContain('onChange={(event) => setForm((current) => ({ ...current, displayName');
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain("['dj_mark', 'dj_szymoniak']");
    expect(api).toContain('vip_dj_id: vipDjId');
    expect(read('supabase/migrations/202611090004_provider_vip_dj_assignment.sql')).toContain(
      "vip_dj_id in ('dj_mark', 'dj_szymoniak')",
    );
    expect(read('supabase/schema.sql')).toContain('vip_dj_id');
  });

  it('wires the shared tier resolver into the DJ view', () => {
    expect(read('src/components/DjBoothView.jsx')).toContain(
      'djDetailTier({ ...wedding, servicePackage: resolvedPackage })',
    );
  });
});
