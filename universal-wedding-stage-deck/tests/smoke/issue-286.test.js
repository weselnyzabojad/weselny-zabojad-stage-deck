import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #286 children reminder in hard-anchor banner', () => {
  it('removes role gating from the badge', () => {
    const badge = read('src/components/ChildrenExpectedBadge.jsx');
    expect(badge).not.toContain('isMediaRole');
    expect(badge).not.toContain('allowMc');
  });
  it('does not render children info inside the hard-anchor banner', () => {
    const banner = read('src/components/HardAnchorAlertBanner.jsx');
    expect(banner).not.toContain('childrenExpected');
    expect(banner).not.toContain('Children expected');
    expect(read('src/views/McMasterView.jsx')).toContain('<ChildrenExpectedBadge');
  });
});
