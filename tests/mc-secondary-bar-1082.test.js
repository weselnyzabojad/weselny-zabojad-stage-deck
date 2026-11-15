import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1082 MC secondary bar alignment', () => {
  const mc = read('src/views/McMasterView.jsx');
  const bar = mc.slice(
    mc.indexOf('<SecondaryControlBar'),
    mc.indexOf('{djMc ? (', mc.indexOf('<SecondaryControlBar')),
  );

  it('orders the left zone as Sync, PIN, DriftPill', () => {
    const sync = bar.indexOf('{syncControl}');
    const pin = bar.indexOf('{pinControl}');
    const drift = bar.indexOf('<DriftPill');
    expect(sync).toBeGreaterThan(-1);
    expect(sync).toBeLessThan(pin);
    expect(pin).toBeLessThan(drift);
  });

  it('orders the right zone as language/theme utilities then Open on phone', () => {
    const utilities = bar.indexOf('{utilityGroup}');
    const phone = bar.indexOf('<OpenOnPhoneButton');
    expect(utilities).toBeGreaterThan(-1);
    expect(utilities).toBeLessThan(phone);
    expect(bar.slice(bar.indexOf('right={('), bar.indexOf('<OpenOnPhoneButton'))).toContain(
      '{utilityGroup}',
    );
  });

  it('keeps Sync and PIN visible during a hard-anchor warning', () => {
    expect(bar).not.toContain('hasAnchorWarning ? null');
    expect(bar).toContain('{syncControl}');
    expect(bar).toContain('{pinControl}');
  });

  it('centres the cultural chips and keeps utilities before Open on phone', () => {
    expect(mc).not.toContain('<StatusMenu');
    const secondary = mc.slice(mc.indexOf('<SecondaryControlBar'));
    const center = secondary.slice(secondary.indexOf('center={'), secondary.indexOf('right={('));
    expect(center).toContain('<CulturalRulesBar');
    expect(center).toContain('<SpeechesChip');
    expect(center).not.toContain('{utilityGroup}');
  });
});
