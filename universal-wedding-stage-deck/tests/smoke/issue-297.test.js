import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #297 centered children reminder', () => {
  it('no longer renders the reminder in the hard-anchor banner', () => {
    const banner = read('src/components/HardAnchorAlertBanner.jsx');
    expect(banner).not.toContain('Children expected');
    expect(banner).not.toContain('childrenExpected');
  });

  it('keeps the centered reminder in the secondary bar', () => {
    const mc = read('src/views/McMasterView.jsx');
    const bar = mc.slice(mc.indexOf('<SecondaryControlBar'), mc.indexOf('{hasAnchorWarning ?'));
    expect(bar).toContain('<ChildrenExpectedBadge');
    expect(bar).toContain('inline');
  });
});
