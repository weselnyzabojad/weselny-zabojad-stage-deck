import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #157 MC top bar simplification', () => {
  const mc = read('src/views/McMasterView.jsx');
  const header = mc.slice(mc.indexOf('{/* ================= TOP BAR'), mc.indexOf('</header>'));

  it('keeps logo, clock, MC label and couple identity on the left', () => {
    expect(header.indexOf('<TopBarClock')).toBeGreaterThan(-1);
    expect(header.indexOf('<TopBarRoleLabel role="mc"')).toBeGreaterThan(
      header.indexOf('<TopBarClock'),
    );
    expect(header.indexOf('<CoupleIdentity')).toBeGreaterThan(
      header.indexOf('<TopBarRoleLabel role="mc"'),
    );
  });

  it('keeps the approved MC controls on the right', () => {
    for (const control of [
      '<CulturalRulesBar',
      '<DriftPill',
      'handleUnpair',
      '<SyncStatusBadge',
      '<RoleSwitcher',
      '<OpenOnPhoneButton',
      '<LanguageToggle',
      '<ThemeToggle',
    ]) {
      expect(header, control).toContain(control);
    }
  });

  it('removes VIP Radar, placeholder Import and Contacts from the top bar', () => {
    expect(header).not.toContain('VIP Radar');
    expect(header).not.toContain('Contacts (');
    expect(header).not.toContain('setOverlay("vip")');
    expect(header).not.toContain('setContactsOpen(true)');
    expect(header).not.toContain('setImporterOpen(true)');
  });

  it('retains the preserved VIP and Contacts modals and records the relocation TODO', () => {
    expect(mc).toContain('<VipAlertsModal');
    expect(mc).toContain('<ContactsModal');
    expect(mc).not.toContain('<CartridgeImporter');
    expect(mc).toContain('TODO(top-bar rework)');

    const project = read('project.md');
    expect(project).toContain('Top-bar relocation TODO');
    expect(project).toContain('VIP Radar');
    expect(project).toContain('vendor Contacts');
    expect(project).not.toContain('cartridge Import');
  });
});
