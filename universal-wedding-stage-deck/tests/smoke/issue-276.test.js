import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #276 cake service mode', () => {
  it('shows both cake service modes on MC', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('CUT_IN_PLACE');
    expect(mc).toContain('ask guests to come to the cake spot');
    expect(mc).toContain('return plated pieces');
  });
  it('resolves the override or cartridge mode in StageDeck', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain('mandatorySettings.cakeServiceMode');
    expect(deck).toContain('cakeServiceMode,');
  });
  it('allows Venue Manager selection', () => {
    expect(read('src/components/VenueManagerView.jsx')).toContain('KITCHEN_RETURN');
    expect(read('src/components/VenueManagerView.jsx')).toContain('CUT_IN_PLACE');
  });
});
