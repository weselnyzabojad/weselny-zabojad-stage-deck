import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #257 ring logo size', () => {
  it('matches the enlarged clock size', () => {
    expect(read('src/components/TopBarClock.jsx')).toContain('text-2xl');
    expect(read('src/components/TopBarCenterIdentity.jsx')).toContain('text-2xl');
  });
});
