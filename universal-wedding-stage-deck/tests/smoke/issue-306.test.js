import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GamesCueCard from '../../src/components/GamesCueCard.jsx';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';
import { resolveGameQuestionLists } from '../../src/lib/games.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #306 games question-list Docs', () => {
  it('validates question-list references in the schema', () => {
    const schema = JSON.parse(read('schema/wedding-schema-v1.1.json'));
    const list = schema.properties.games.properties.questionLists.items;
    expect(list.properties.sourceDocId.type).toBe('string');
    expect(list.properties.status.enum).toEqual(['AVAILABLE', 'MISSING', 'UNAVAILABLE']);
    expect(list.properties.questions.type).toBe('array');
  });

  it('parses available question lists from the cartridge', () => {
    const lists = resolveGameQuestionLists(DEMO_WEDDING);
    const quiz = lists.find((list) => list.id === 'test_wiedzy');
    expect(quiz.title).toBe('Test Wiedzy');
    expect(quiz.unavailable).toBe(false);
    expect(quiz.questions).toHaveLength(3);
    expect(quiz.questions[0].prompt).toContain('Jennifer');
  });

  it('parses both predefined question lists', () => {
    const lists = resolveGameQuestionLists(DEMO_WEDDING);
    const compat = lists.find((list) => list.id === 'test_zgodnosci');
    expect(compat.status).toBe('AVAILABLE');
    expect(compat.unavailable).toBe(false);
    expect(compat.questions.length).toBeGreaterThan(0);
  });

  it('honours the optional games flag', () => {
    expect(resolveGameQuestionLists({ ...DEMO_WEDDING, games: { enabled: false } })).toEqual([]);
  });

  it('renders game content on MC without exposing source links', () => {
    const html = renderToStaticMarkup(
      createElement(GamesCueCard, { wedding: DEMO_WEDDING, role: 'mc' }),
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
        wedding: DEMO_WEDDING,
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
    expect(mc).toContain("currentStep.optionalFlag === 'games'");
  });
});
