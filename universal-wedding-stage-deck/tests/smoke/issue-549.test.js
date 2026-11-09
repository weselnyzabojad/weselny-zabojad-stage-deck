import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { filterEnabledSteps } from '../../src/lib/predefinedSteps.js';
import { buildGameClicker } from '../../src/lib/games.js';
import { isPredefinedGameStep } from '../../src/lib/gameQuestions.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const wedding = {
  wishes: { enabled: true },
  oczepiny: { enabled: true },
  games: {
    enabled: true,
    questionLists: [
      {
        id: 'test_wiedzy',
        title: 'Test Wiedzy',
        gameType: 'TEST_WIEDZY',
        questions: [{ id: 'q1', prompt: 'Who is who?' }],
      },
    ],
  },
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
      optionalFlag: 'games',
    },
    {
      id: 'step_quiz',
      time: '22:00',
      durationMin: 30,
      title: 'Test Wiedzy',
      type: 'FLEXIBLE',
      location: 'Main Hall',
      optionalFlag: 'games',
      gameId: 'test_wiedzy',
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
    expect(dance.optionalFlag).toBe('games');
    expect(dance.gameId).toBeUndefined();
    // Not a predefined question game, so MC cues/overflow stay visible.
    expect(isPredefinedGameStep(dance)).toBe(false);
    // No question list -> no clicker.
    expect(buildGameClicker(wedding, dance.gameId)).toBeNull();
  });

  it('does not render the question-list card for a game without a gameId', () => {
    const view = read('src/views/McMasterView.jsx');
    expect(view).toContain('isGameStep && currentStep.gameId');
    expect(view).not.toContain('gameId={currentStep.gameId ?? null}');
  });

  it('still renders the question-list card for question games', () => {
    const quiz = wedding.steps.find((step) => step.id === 'step_quiz');
    expect(buildGameClicker(wedding, quiz.gameId)).not.toBeNull();
  });
});
