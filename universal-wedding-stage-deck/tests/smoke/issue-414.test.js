import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import GamesCueCard from '../../src/components/GamesCueCard.jsx';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #414 one timeline step per game', () => {
  it('keeps Test Wiedzy and Test Zgodności as separate demo steps', () => {
    const wiedzy = DEMO_WEDDING.steps.find((step) => step.id === 'step_10');
    const zgodnosci = DEMO_WEDDING.steps.find((step) => step.id === 'step_11');
    expect(wiedzy).toMatchObject({ title: 'Test Wiedzy', game: { id: 'test_wiedzy' } });
    expect(zgodnosci).toMatchObject({ title: 'Test Zgodności', game: { id: 'test_zgodnosci' } });
  });

  it('filters the games cue card to the current game', () => {
    const wiedzy = renderToStaticMarkup(
      createElement(GamesCueCard, {
        wedding: DEMO_WEDDING,
        role: 'mc',
        gameId: 'test_wiedzy',
      }),
    );
    expect(wiedzy).toContain('Test Wiedzy');
    expect(wiedzy).not.toContain('Test Zgodności');

    const zgodnosci = renderToStaticMarkup(
      createElement(GamesCueCard, {
        wedding: DEMO_WEDDING,
        role: 'mc',
        gameId: 'test_zgodnosci',
      }),
    );
    expect(zgodnosci).toContain('Test Zgodności');
    expect(zgodnosci).not.toContain('Test Wiedzy');
  });

  it('binds game steps to question lists in the Google Doc mapper', () => {
    const source = read('src/lib/googleDocCartridge.js');
    expect(source).toContain('step.game = match');
    expect(source).toContain('delete step.gameId');
    const template = read('schema/google-doc-template.md');
    expect(template).toContain('| step_10 | 01:00 | 30 | Test Wiedzy |');
    expect(template).toContain('| step_11 | 01:30 | 30 | Test Zgodności |');
    expect(template).not.toContain('| step_10 | 01:00 | 60 | Games |');
  });

  it('passes the current game id to the cue card', () => {
    expect(read('src/views/McMasterView.jsx')).toContain(
      'gameId={currentStep.game.id}',
    );
  });
});
