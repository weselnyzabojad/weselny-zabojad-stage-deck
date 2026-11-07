import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #276 cake service mode', () => {
  it('shows the cake service mode inside Cake Protocol', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('cakeServiceMode={cakeServiceMode}');
    const cake = read('src/components/CakeCard.jsx');
    expect(cake).toContain('serviceModeLabel');
    expect(cake).toContain('mandatory.cakeMode');
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
