import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #258 dev DJ Standard preview', () => {
  it('adds a forced Standard entry to the dev switcher', () => {
    expect(read('src/lib/viewRoles.js')).toContain("'dj_standard'");
    expect(read('src/components/DevViewSwitcher.jsx')).toContain('dj_standard');
  });
  it('forces the Standard package when selected', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain("currentRole === 'dj_standard' ? 'HOST_AND_DJ_STANDARD'");
    expect(deck).toContain('currentRole === "dj" || currentRole === "dj_standard"');
  });
});
