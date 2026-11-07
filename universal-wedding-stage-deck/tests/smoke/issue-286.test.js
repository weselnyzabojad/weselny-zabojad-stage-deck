import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #286 children reminder in hard-anchor banner', () => {
  it('removes MC from the floating badge', () => {
    const badge = read('src/components/ChildrenExpectedBadge.jsx');
    expect(badge).not.toContain("role !== 'mc'");
    expect(badge).toContain('isMediaRole(role)');
  });
  it('renders children info inside the hard-anchor banner', () => {
    const banner = read('src/components/HardAnchorAlertBanner.jsx');
    expect(banner).toContain('childrenExpected');
    expect(banner).toContain('Children expected');
    expect(read('src/views/McMasterView.jsx')).toContain('childrenExpected={childrenExpected}');
  });
});
