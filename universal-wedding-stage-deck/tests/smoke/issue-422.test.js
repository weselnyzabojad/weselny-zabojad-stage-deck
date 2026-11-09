import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #422 PWA orientation', () => {
  it('lets the installed app rotate freely', () => {
    const config = read('vite.config.js');
    expect(config).toContain("orientation: 'any'");
    expect(config).not.toContain("orientation: 'landscape'");
  });
});
