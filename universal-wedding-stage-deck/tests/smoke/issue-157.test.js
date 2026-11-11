import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const exists = (path) => existsSync(new URL(`../../${path}`, import.meta.url));

describe('issue #157 MC top bar simplification', () => {
  const mc = read('src/views/McMasterView.jsx');
  const header = mc.slice(
    mc.indexOf('<TopBarShell'),
    mc.indexOf('\n      {hasAnchorWarning ? ('),
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
      'utilityGroup',
    ]) {
      expect(header, control).toContain(control);
    }
    expect(mc).toContain('onSignOut={handleUnpair}');
    expect(mc).toContain('<RoleSignOutControl');
    expect(mc).toContain('<SyncStatusBadge');
  });

  it('removes VIP Radar, placeholder Import and Contacts from the top bar', () => {
    expect(header).not.toContain('VIP Radar');
    expect(header).not.toContain('Contacts (');
    expect(header).not.toContain('setOverlay("vip")');
    expect(header).not.toContain('setContactsOpen(true)');
    expect(header).not.toContain('setImporterOpen(true)');
  });

  it('removes the VIP Radar and Contacts features entirely', () => {
    expect(mc).not.toContain('<VipAlertsModal');
    expect(mc).not.toContain('<ContactsModal');
    expect(mc).not.toContain('<CartridgeImporter');
    expect(exists('src/components/VipAlertsModal.jsx')).toBe(false);
    expect(exists('src/components/ContactsModal.jsx')).toBe(false);
    expect(exists('src/lib/contacts.js')).toBe(false);
    expect(read('src/StageDeck.jsx')).not.toContain('useSensitiveNotes');
    expect(read('src/StageDeck.jsx')).not.toContain('resolveContacts');
    expect(read('project.md')).not.toContain('Top-bar relocation');
  });
});
