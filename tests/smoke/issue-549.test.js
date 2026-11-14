import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { filterEnabledSteps } from '../../src/lib/predefinedSteps.js';
import { buildGameClicker } from '../../src/lib/games.js';
import { isPredefinedGameStep } from '../../src/lib/gameQuestions.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const wedding = {
  oczepiny: { enabled: true },
  steps: [
    {
      id: 'step_bread',
      time: '15:00',
      durationMin: 15,
      title: 'Bread & Salt',
      type: 'FLEXIBLE',
      location: 'Main Hall',
    },
    {
      id: 'step_dance',
      time: '21:00',
      durationMin: 20,
      title: 'Dance with Bride and Groom',
      type: 'FLEXIBLE',
      location: 'Main Hall',
    },
    {
      id: 'step_quiz',
      time: '22:00',
      durationMin: 30,
      title: 'Test Wiedzy',
      type: 'FLEXIBLE',
      location: 'Main Hall',
      game: {
        id: 'test_wiedzy',
        title: 'Test Wiedzy',
        gameType: 'TEST_WIEDZY',
        enabled: true,
        status: 'AVAILABLE',
        questions: [{ id: 'q1', prompt: 'Who is who?' }],
      },
    },
  ],
};

describe('issue #549 Bread & Salt and Dance-with-the-couple steps', () => {
  it('keeps Bread & Salt a plain FLEXIBLE step, distinct from Wishes and Ceremony', () => {
    const bread = filterEnabledSteps(wedding).find((step) => step.id === 'step_bread');
    expect(bread).toMatchObject({ type: 'FLEXIBLE', title: 'Bread & Salt' });
    expect(bread.optionalFlag).toBeUndefined();
  });

  it('treats Dance with Bride and Groom as a game step without a question list', () => {
    const enabled = filterEnabledSteps(wedding).map((step) => step.id);
    expect(enabled).toContain('step_dance');

    const dance = wedding.steps.find((step) => step.id === 'step_dance');
    expect(dance.game).toBeUndefined();
    // Not a predefined question game, so the MC cue block stays visible.
    expect(isPredefinedGameStep(dance)).toBe(false);
    // No question list -> no clicker.
    expect(buildGameClicker(wedding, dance.game?.id)).toBeNull();
  });

  it('keeps the question-list card scoped to the current step game id', () => {
    const view = read('src/views/McMasterView.jsx');
    expect(view).toContain(
      'const showGameBriefing = isGameStep && !isPredefinedGameStep(currentStep)',
    );
    expect(view).toContain('gameId={currentStep.game.id}');
  });

  it('still renders the question-list card for question games', () => {
    const quiz = wedding.steps.find((step) => step.id === 'step_quiz');
    expect(buildGameClicker(wedding, quiz.game.id)).not.toBeNull();
  });
});
