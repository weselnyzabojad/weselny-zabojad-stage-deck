import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #398 Game Clicker only on the games step', () => {
  it('gates the button and overlay on the games step', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('const isGameStep = Boolean(');
    expect(mc).toContain('{isGameStep && game && (');
    expect(mc).toContain('{overlay === "game" && isGameStep && (');
  });

  it('removes the game payload from the wedding cake step', () => {
    const cake = DEMO_WEDDING.steps.find((step) => step.id === 'step_05');
    expect(cake.teleprompter).toBeUndefined();
    for (const file of [
      'schema/domains/steps.example.json',
      'schema/fixtures/real-jennifer-guillaume.json',
    ]) {
      const cartridge = JSON.parse(read(file));
      const cakeStep = cartridge.steps.find((step) => step.id === 'step_05');
      expect(cakeStep.teleprompter).toBeUndefined();
    }
  });

  it('keeps the game clicker available on the games step', () => {
    const games = DEMO_WEDDING.steps.find((step) => step.id === 'step_10');
    expect(games.optionalFlag).toBe('games');
  });
});
