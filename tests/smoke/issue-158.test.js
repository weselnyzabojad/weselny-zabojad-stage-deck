import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #158 non-MC desktop top bars', () => {
  const dj = read('src/components/DjBoothView.jsx');
  const photo = read('src/components/PhotographerView.jsx');
  const speaker = read('src/components/SpeakerView.jsx');
  const app = read('src/App.jsx');

  it('keeps DJ Standard minimal and DJ VIP differentiated', () => {
    expect(dj).toContain('<TopBarClock');
    expect(dj).toContain('<TopBarRoleIdentity role={role} tier={tierLabel} />');
    expect(dj).not.toContain('<TopBarRoleLabel');
    expect(dj).toContain('<OpenOnPhoneButton role={role} tier={tierLabel}');
    expect(dj).toContain('{caps.guestRequests ? (');
    expect(dj).toContain('<TopBarCenterIdentity');
    expect(dj).not.toContain('<DriftPill');
    expect(dj).not.toContain('<RoleSwitcher');
  });

  it('keeps Photographer to clock, role, sync, phone QR, language and theme', () => {
    expect(photo).toContain('<TopBarClock');
    expect(photo).toContain('<TopBarRoleIdentity role={role} />');
    expect(photo).not.toContain('<TopBarRoleLabel');
    expect(photo).toContain('<OpenOnPhoneButton role={role}');
    expect(photo).toContain('<TopBarCenterIdentity');
    expect(photo).not.toContain('<RoleSwitcher');
  });

  it('keeps Speaker to clock, role, sync, phone QR, language and theme', () => {
    expect(speaker).toContain('<TopBarClock');
    expect(speaker).toContain('<TopBarRoleIdentity role="speaker" />');
    expect(speaker).not.toContain('<TopBarRoleLabel');
    expect(speaker).toContain('<OpenOnPhoneButton role="speaker"');
    expect(speaker).toContain('<TopBarCenterIdentity');
    expect(speaker).not.toContain('<RoleSwitcher');
  });

  it('removes the local Speaker Exit control', () => {
    expect(speaker).not.toContain('canExit');
    expect(speaker).not.toContain('onExit');
    expect(speaker).not.toContain("t('speaker.exit')");
    expect(app).not.toContain('canExit={!IS_PRODUCTION}');
    expect(app).not.toContain('onExit={() => handleRoleChange("mc")}');
  });
});
