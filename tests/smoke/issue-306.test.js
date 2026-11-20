import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GamesCueCard from '../../src/components/GamesCueCard.jsx';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';
import { resolveGameQuestionLists } from '../../src/lib/games.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

// Issue #931: published cartridges keep only game metadata. Rendering tests
// inject a legacy in-memory question list so the existing MC cue is exercised
// without putting question text back into the cartridge contract.
const WEDDING_WITH_LEGACY_QUESTIONS = {
  ...DEMO_WEDDING,
  steps: DEMO_WEDDING.steps.map((step) =>
    step.game?.id === 'test_wiedzy'
      ? {
          ...step,
          game: {
            ...step.game,
            questions: [
              { id: 'w01', prompt: 'Where did Jennifer and Guillaume first meet?' },
              { id: 'w02', prompt: 'Who said I love you first?' },
              { id: 'w03', prompt: 'What is the couple dog called?' },
            ],
          },
        }
      : step.game?.id === 'test_zgodnosci'
        ? {
            ...step,
            game: {
              ...step.game,
              questions: [
                { id: 'z01', prompt: 'Who plans spontaneous trips?' },
                { id: 'z02', prompt: 'Who takes longer to get ready?' },
              ],
            },
          }
        : step,
  ),
};

describe('issue #306 games question-list Docs', () => {
  it('keeps only metadata in the published game schema', () => {
    const schema = JSON.parse(read('schema/domains/steps.json'));
    const game = schema.$defs.game;
    expect(game.properties.sourceDocId.type).toBe('string');
    expect(game.properties.status.enum).toEqual(['AVAILABLE', 'MISSING', 'UNAVAILABLE']);
    expect(game.properties.questions).toBeUndefined();
    for (const field of [
      'id',
      'title',
      'gameType',
      'enabled',
      'requiresPhotographer',
      'sourceDocId',
      'status',
    ]) {
      expect(game.properties[field], field).toBeTruthy();
    }
  });

  it('parses legacy question lists passed in memory', () => {
    const lists = resolveGameQuestionLists(WEDDING_WITH_LEGACY_QUESTIONS);
    const quiz = lists.find((list) => list.id === 'test_wiedzy');
    expect(quiz.title).toBe('Test Wiedzy');
    expect(quiz.unavailable).toBe(false);
    expect(quiz.questions).toHaveLength(3);
    expect(quiz.questions[0].prompt).toContain('Jennifer');
  });

  it('parses both predefined question lists', () => {
    const lists = resolveGameQuestionLists(WEDDING_WITH_LEGACY_QUESTIONS);
    const compat = lists.find((list) => list.id === 'test_zgodnosci');
    expect(compat.status).toBe('AVAILABLE');
    expect(compat.unavailable).toBe(false);
    expect(compat.questions.length).toBeGreaterThan(0);
  });

  it('honours the step-scoped game flag', () => {
    expect(
      resolveGameQuestionLists({
        ...WEDDING_WITH_LEGACY_QUESTIONS,
        steps: WEDDING_WITH_LEGACY_QUESTIONS.steps.map((step) =>
          step.game ? { ...step, game: { ...step.game, enabled: false } } : step,
        ),
      }),
    ).toEqual([]);
  });

  it('renders game content on MC without exposing source links', () => {
    const html = renderToStaticMarkup(
      createElement(GamesCueCard, { wedding: WEDDING_WITH_LEGACY_QUESTIONS, role: 'mc' }),
    );
    expect(html).toContain('Test Wiedzy');
    expect(html).toContain('3 questions');
    expect(html).toContain('Test Zgodności');
    expect(html).not.toContain('gdoc_test_wiedzy');
    expect(html).not.toContain('http');
  });

  it('never renders games outside MC', () => {
    expect(
      renderToStaticMarkup(createElement(GamesCueCard, {
        wedding: WEDDING_WITH_LEGACY_QUESTIONS,
        role: 'dj',
      })),
    ).toBe('');
  });

  it('documents question-list Doc references in the template', () => {
    const template = read('schema/google-doc-template.md');
    expect(template).toContain('Question list Doc: gdoc_test_wiedzy');
    expect(template).toContain('Question list Doc: gdoc_test_zgodnosci');
  });

  it('wires the MC games cue', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('GamesCueCard');
    expect(mc).toContain('const isGameStep = Boolean(currentStep?.game)');
  });
});
