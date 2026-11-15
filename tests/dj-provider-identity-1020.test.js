import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1020 DJ provider identity branding', () => {
  it('uses the assigned provider name and never a generic DJ VIP label', () => {
    const identity = read('src/components/TopBarRoleIdentity.jsx');
    expect(identity).toContain('resolveDjIdentityId(wedding)');
    expect(identity).toContain('vipDjById');
    expect(identity).toContain("provider?.displayName ?? 'DJ'");
    expect(identity).not.toContain('DJ VIP');

    const label = read('src/components/TopBarRoleLabel.jsx');
    expect(label).toContain('resolveDjIdentityId(wedding)');
    expect(label).toContain("provider?.displayName ?? 'DJ'");
    expect(label).not.toContain('DJ VIP');
  });

  it('passes the wedding identity into the DJ top bar and keeps the logo identity-driven', () => {
    const view = read('src/components/DjBoothView.jsx');
    expect(view).toContain('<TopBarRoleIdentity role={role} tier={tierLabel} wedding={wedding} />');
    const logo = read('src/components/VipDjLogo.jsx');
    expect(logo).toContain('resolveDjIdentityId(wedding)');
    expect(logo).not.toContain('defaultVipDjId');
  });

  it('keeps provider preview ids mapped to their own identity', () => {
    const stage = read('src/StageDeck.jsx');
    expect(stage).toContain('djIdentityId: devDjPreviewId');
    expect(stage).toContain("servicePackage: 'HOST_AND_DJ_VIP'");
  });
});
