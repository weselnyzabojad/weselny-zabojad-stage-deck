import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1022 shared header status menu', () => {
  it('provides an accessible popover with Escape, outside click and focus return', () => {
    const menu = read('src/components/StatusMenu.jsx');
    expect(menu).toContain('aria-expanded={open}');
    expect(menu).toContain('aria-haspopup="menu"');
    expect(menu).toContain("event.key === 'Escape'");
    expect(menu).toContain('triggerRef.current?.focus()');
    expect(menu).toContain("document.addEventListener('mousedown'");
    expect(menu).toContain('role="menu"');
    expect(menu).toContain("t('statusMenu.label')");
  });

  it('groups secondary controls in every shared header', () => {
    const expectations = [
      ['src/views/McMasterView.jsx', ['CulturalRulesBar', 'SpeechesChip', 'ChildrenExpectedBadge']],
      ['src/components/DjBoothView.jsx', ['CulturalRulesBar', 'SpeechSummaryChip', 'ChildrenExpectedBadge', 'UtilityControlGroup']],
      ['src/components/PhotographerView.jsx', ['CulturalRulesBar', 'SpeechSummaryChip', 'ChildrenExpectedBadge', 'UtilityControlGroup']],
      ['src/components/VenueManagerView.jsx', ['ChildrenExpectedBadge', 'SpeechSummaryChip', 'UtilityControlGroup']],
      ['src/components/SpeakerView.jsx', ['UtilityControlGroup']],
    ];
    for (const [path, markers] of expectations) {
      const source = read(path);
      expect(source, path).toContain('<StatusMenu');
      const start = source.indexOf('<StatusMenu');
      const end = source.indexOf('</StatusMenu>', start);
      const block = source.slice(start, end);
      for (const marker of markers) expect(block, `${path} ${marker}`).toContain(marker);
    }
  });

  it('keeps primary controls outside the menu', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('<DriftPill');
    expect(mc).toContain('{pinControl}');
    expect(mc).toContain('{syncControl}');
    expect(mc).toContain('<OpenOnPhoneButton');

    const dj = read('src/components/DjBoothView.jsx');
    expect(dj).toContain('<OpenOnPhoneButton');
    expect(dj).toContain('<SyncStatusBadge');
  });

  it('keeps the clock, role and couple identity outside the menu', () => {
    for (const path of [
      'src/views/McMasterView.jsx',
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/VenueManagerView.jsx',
      'src/components/SpeakerView.jsx',
    ]) {
      const source = read(path);
      expect(source, path).toContain('<TopBarClock');
      expect(source, path).toContain('<TopBarCenterIdentity');
    }
  });
});
