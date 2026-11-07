import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #256 DJ Standard laptop-only', () => {
  const dj = read('src/components/DjBoothView.jsx');
  it('blocks the compact Standard layout with a desktop notice', () => {
    expect(dj).toContain('if (!isVip)');
    expect(dj).toContain("t('dj.laptopRequiredTitle')");
    expect(dj).toContain("t('dj.laptopRequiredBody')");
  });
  it('keeps the VIP pocket layout', () => {
    expect(dj).toMatch(/return \(\s*<RoleShell/);
  });
});
