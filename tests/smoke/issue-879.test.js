import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { vipAssignmentError } from '../../supabase/functions/_shared/adminPublish.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #879 VIP DJ identity and MC warning', () => {
  it('accepts VIP packages only with DJ Mark or DJ Szymoniak', () => {
    for (const dj of ['dj_mark', 'dj_szymoniak']) {
      expect(vipAssignmentError({ servicePackage: 'HOST_AND_DJ_VIP', djIdentityId: dj })).toBeNull();
      expect(vipAssignmentError({ servicePackage: 'DJ_MC', djIdentityId: dj })).toBeNull();
    }

    for (const dj of [null, 'other_dj']) {
      expect(vipAssignmentError({ servicePackage: 'HOST_AND_DJ_VIP', djIdentityId: dj })).toContain(
        'DJ Mark or DJ Szymoniak',
      );
      expect(vipAssignmentError({ servicePackage: 'DJ_MC', djIdentityId: dj })).toContain(
        'DJ Mark or DJ Szymoniak',
      );
    }
  });

  it('does not constrain non-VIP packages', () => {
    expect(vipAssignmentError({ servicePackage: 'HOST_ONLY', djIdentityId: null })).toBeNull();
    expect(vipAssignmentError({ servicePackage: 'HOST_ONLY', djIdentityId: 'other' })).toBeNull();
  });

  it('rejects the publish before writing a revision', () => {
    const publish = read('supabase/functions/_shared/adminPublish.js');
    expect(publish).toContain('vipAssignmentError(cartridge)');
    expect(publish).toContain("code: 'vip_dj_required'");
    expect(publish.indexOf('vipAssignmentError(cartridge)')).toBeLessThan(
      publish.indexOf('stage_deck_publish_cartridge'),
    );
  });

  it('exposes package, DJ and MC state in the admin list', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    for (const field of ['servicePackage', 'djIdentityId', 'vipDjValid', 'mcConfirmed', 'vipWarning']) {
      expect(api).toContain(field);
    }
    expect(api).toContain("servicePackage === 'HOST_AND_DJ_VIP' || servicePackage === 'DJ_MC'");
    expect(api).toContain('MC unconfirmed');
  });

  it('renders the warning in the admin wedding list', () => {
    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain('wedding.vipWarning');
    expect(app).toContain('VIP package ${wedding.servicePackage}');
  });

  it('keeps the provider VIP identity restricted to Mark/Szymoniak', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain("!['dj_mark', 'dj_szymoniak'].includes(requestedVipDjId)");
    expect(api).toContain("return { error: 'Choose a known VIP DJ.' }");
  });
});
