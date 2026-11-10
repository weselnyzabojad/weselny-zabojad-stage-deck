import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isPredefinedGameStep } from '../../src/lib/gameQuestions.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #539 hide the More/swap control on predefined game steps', () => {
  it('detects both predefined games by step-scoped type and leaves other steps alone', () => {
    expect(isPredefinedGameStep({ game: { gameType: 'TEST_WIEDZY' } })).toBe(true);
    expect(isPredefinedGameStep({ game: { gameType: 'TEST_ZGODNOSCI' } })).toBe(true);
    // A normal step (or a custom game) must keep the control.
    expect(isPredefinedGameStep({ id: 'step_01', title: 'Cocktail' })).toBe(false);
    expect(isPredefinedGameStep({ game: { gameType: 'OTHER' } })).toBe(false);
    // Title-only detection is never used.
    expect(isPredefinedGameStep({ title: 'Test Wiedzy' })).toBe(false);
    expect(isPredefinedGameStep(null)).toBe(false);
  });

  it('guards both MC current-step layouts with the stable-id check', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain("import { isPredefinedGameStep } from '../lib/gameQuestions.js'");
    expect(mc).toContain('const hideStepOverflow = isPredefinedGameStep(currentStep)');
    // Desktop hero and compact pocket card are both guarded.
    expect(mc.match(/hideStepOverflow \? null :/g)).toHaveLength(2);
    expect(mc.match(/<CurrentStepOverflow/g)).toHaveLength(2);
  });

  it('keeps the More/swap control for non-game steps', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc.match(/onSwap=\{handleSwap\}/g)).toHaveLength(2);
    const control = read('src/components/CurrentStepOverflow.jsx');
    expect(control).toContain("t('mc.step.more')");
    expect(control).toContain("t('mc.step.swapNext')");
  });

  it('does not alter timeline, drift or cartridge code', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).not.toContain('durationMin =');
    expect(mc).not.toContain('step_order');
    expect(mc).not.toContain('cartridgeRevision');
  });
});
