import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isPredefinedGameStep } from '../../src/lib/gameQuestions.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #539 remove the More/swap control from MC step cards', () => {
  it('detects both predefined games by step-scoped type and leaves other steps alone', () => {
    expect(isPredefinedGameStep({ game: { gameType: 'TEST_WIEDZY' } })).toBe(true);
    expect(isPredefinedGameStep({ game: { gameType: 'TEST_ZGODNOSCI' } })).toBe(true);
    expect(isPredefinedGameStep({ id: 'step_01', title: 'Cocktail' })).toBe(false);
    expect(isPredefinedGameStep({ game: { gameType: 'OTHER' } })).toBe(false);
    expect(isPredefinedGameStep({ title: 'Test Wiedzy' })).toBe(false);
    expect(isPredefinedGameStep(null)).toBe(false);
  });

  it('removes the More/swap control from both MC current-step layouts', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).not.toContain('CurrentStepOverflow');
    expect(mc).not.toContain('hideStepOverflow');
    expect(mc).not.toContain('onSwap={handleSwap}');
    expect(mc.match(/handleSwap/g)).toBeNull();
  });

  it('does not alter timeline, drift or cartridge code', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).not.toContain('durationMin =');
    expect(mc).not.toContain('step_order');
    expect(mc).not.toContain('cartridgeRevision');
  });
});
