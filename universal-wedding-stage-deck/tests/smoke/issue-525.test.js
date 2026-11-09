import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isPredefinedGameStep } from '../../src/lib/gameQuestions.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #525 hide MC Cues on predefined game steps', () => {
  it('detects both predefined games by stable id', () => {
    expect(isPredefinedGameStep({ gameId: 'test_wiedzy' })).toBe(true);
    expect(isPredefinedGameStep({ gameId: 'test_zgodnosci' })).toBe(true);
    expect(isPredefinedGameStep({ gameId: 'custom_game', optionalFlag: 'games' })).toBe(false);
    expect(isPredefinedGameStep({ title: 'Test Wiedzy' })).toBe(false);
    expect(isPredefinedGameStep(null)).toBe(false);
  });

  it('wraps the MC Cues block in the game-step exemption', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain("import { isPredefinedGameStep } from '../lib/gameQuestions.js'");
    expect(mc).toContain('const hideMcCues = isPredefinedGameStep(currentStep)');
    expect(mc).toContain('{hideMcCues ? null : (');
    const start = mc.indexOf('{hideMcCues ? null : (');
    const cues = mc.slice(start, mc.indexOf('{currentStep.grandEntranceOrder', start));
    expect(cues).toContain("t('mc.step.cuesTitle')");
    expect(cues).toContain("t('mc.cues.empty')");
  });

  it('keeps the games cue and clicker launcher', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('<GamesCueCard wedding={WEDDING} role="mc"');
    expect(mc).toContain('setOverlay(\'game\')');
    expect(mc).toContain('<GameClickerOverlay');
  });

  it('does not alter timeline, drift or cartridge code', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).not.toContain('durationMin =');
    expect(mc).not.toContain('step_order');
    expect(mc).not.toContain('cartridgeRevision');
  });
});
