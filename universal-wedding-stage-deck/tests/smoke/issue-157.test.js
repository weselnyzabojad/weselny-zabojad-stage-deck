import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #157 MC top bar simplification', () => {
  const mc = read('src/views/McMasterView.jsx');
  const header = mc.slice(
    mc.indexOf('<TopBarShell'),
    mc.indexOf('{/* TODO(top-bar rework)'),
  );

  it('keeps logo, clock, MC label and couple identity', () => {
    expect(header).toContain('<TopBarShell');
    expect(header).toContain('<TopBarClock');
    expect(header).toContain('<TopBarRoleLabel role="mc"');
    expect(header).toContain('<TopBarCenterIdentity wedding={WEDDING}');
  });

  it('keeps the approved MC controls on the right', () => {
    for (const control of [
      '<CulturalRulesBar',
      '<DriftPill',
      '{pinControl}',
      '{syncControl}',
      '<OpenOnPhoneButton',
      '<LanguageToggle',
      '<ThemeToggle',
    ]) {
      expect(header, control).toContain(control);
    }
    expect(mc).toContain('onClick={handleUnpair}');
    expect(mc).toContain('<SyncStatusBadge');
  });

  it('removes VIP Radar, placeholder Import and Contacts from the top bar', () => {
    expect(header).not.toContain('VIP Radar');
    expect(header).not.toContain('Contacts (');
    expect(header).not.toContain('setOverlay("vip")');
    expect(header).not.toContain('setContactsOpen(true)');
    expect(header).not.toContain('setImporterOpen(true)');
  });

  it('retains the preserved VIP and Contacts modals and records the relocation decision', () => {
    expect(mc).toContain('<VipAlertsModal');
    expect(mc).toContain('<ContactsModal');
    expect(mc).not.toContain('<CartridgeImporter');
    expect(mc).toContain('TODO(top-bar rework)');

    const project = read('project.md');
    expect(project).toContain('Top-bar relocation pending owner decision');
    expect(project).toContain('Planning TODO register');
    expect(project).toContain('VIP Radar');
    expect(project).toContain('vendor Contacts');
    expect(project).not.toContain('cartridge Import');
  });
});
