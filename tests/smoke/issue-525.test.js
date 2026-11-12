import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isPredefinedGameStep } from '../../src/lib/gameQuestions.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #525 show MC Notes on predefined game steps', () => {
  it('detects both predefined games by step-scoped game type', () => {
    expect(isPredefinedGameStep({ game: { gameType: 'TEST_WIEDZY' } })).toBe(true);
    expect(isPredefinedGameStep({ game: { gameType: 'TEST_ZGODNOSCI' } })).toBe(true);
    expect(isPredefinedGameStep({ game: { gameType: 'OTHER' } })).toBe(false);
    expect(isPredefinedGameStep({ title: 'Test Wiedzy' })).toBe(false);
    expect(isPredefinedGameStep(null)).toBe(false);
  });

  it('removes the old MC-cue exemption and mcCues rendering', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).not.toContain('hideMcCues');
    expect(mc).not.toContain('mcCues');
    expect(mc).not.toContain("t('mc.step.cuesTitle')");
  });

  it('keeps the Notes block available on every step type', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('{currentStep.notes ? (');
    expect(mc).toContain("t('mc.step.notesTitle')");
    expect(mc).not.toMatch(/isPredefinedGameStep\(currentStep\)\s*\?\s*null/);
  });

  it('does not alter timeline, drift or cartridge code', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).not.toContain('durationMin =');
    expect(mc).not.toContain('step_order');
    expect(mc).not.toContain('cartridgeRevision');
  });
});
