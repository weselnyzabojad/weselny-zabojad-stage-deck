import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #297 centered children reminder', () => {
  it('centers the reminder in the banner', () => {
    const banner = read('src/components/HardAnchorAlertBanner.jsx');
    expect(banner).toContain('mx-auto');
    expect(banner).toContain('text-center');
    expect(banner).toContain('Children expected');
  });
});
