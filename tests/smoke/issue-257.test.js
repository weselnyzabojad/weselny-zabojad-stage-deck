import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #257 ring logo size', () => {
  it('matches the enlarged clock with a refined decorative ring', () => {
    expect(read('src/components/TopBarClock.jsx')).toContain('text-3xl');
    expect(read('src/components/TopBarCenterIdentity.jsx')).toContain('text-xl');
    expect(read('src/components/TopBarCenterIdentity.jsx')).toContain('rounded-full bg-raised/50 p-1');
  });
});
