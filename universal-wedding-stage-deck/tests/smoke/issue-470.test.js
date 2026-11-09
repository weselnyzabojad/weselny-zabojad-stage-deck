import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GameClickerOverlay from '../../src/components/GameClickerOverlay.jsx';
import {
  GAME_LEVELS,
  gameCounters,
  orderGameItems,
  unansweredItems,
} from '../../src/lib/games.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const items = [
  { id: 'h1', level: 'HARD', question: 'Hard one', answer: 'Jennifer' },
  { id: 'e1', level: 'EASY', question: 'Easy one', answer: 'Guillaume' },
  { id: 'm1', level: 'MEDIUM', question: 'Medium one', answer: 'Jennifer' },
  { id: 'e2', level: 'EASY', question: 'Easy two', answer: 'Guillaume' },
];
const wiedzy = { id: 'test_wiedzy', title: 'Test Wiedzy', gameType: 'TEST_WIEDZY', items };
const zgodnosci = {
  id: 'test_zgodnosci',
  title: 'Test Zgodności',
  gameType: 'TEST_ZGODNOSCI',
  items: [
    { id: 'z1', question: 'First?', answer: null },
    { id: 'z2', question: 'Second?', answer: null },
  ],
};

describe('issue #470 MC game clicker flow', () => {
  it('orders Wiedzy EASY → MEDIUM → HARD with Doc order inside a level', () => {
    expect(GAME_LEVELS).toEqual(['EASY', 'MEDIUM', 'HARD']);
    expect(orderGameItems(items, 'TEST_WIEDZY').map((item) => item.id)).toEqual([
      'e1',
      'e2',
      'm1',
      'h1',
    ]);
    expect(orderGameItems(items, 'TEST_ZGODNOSCI').map((item) => item.id)).toEqual([
      'h1',
      'e1',
      'm1',
      'e2',
    ]);
  });

  it('suppresses answered questions and tracks counters', () => {
    expect(unansweredItems(items, { e1: { id: 'e1' } }).map((item) => item.id)).toEqual([
      'h1',
      'm1',
      'e2',
    ]);
    expect(gameCounters(items, { e1: {}, m1: {} })).toEqual({
      total: 4,
      answered: 2,
      remaining: 2,
      currentNumber: 3,
    });
  });

  it('renders the Wiedzy reveal flow with level and counters', () => {
    const html = renderToStaticMarkup(
      createElement(GameClickerOverlay, { open: true, game: wiedzy, onClose: () => {} }),
    );
    expect(html).toContain('Test Wiedzy');
    expect(html).toContain('Easy one');
    expect(html).toContain('Easy');
    expect(html).toContain('Answered 0');
    expect(html).toContain('Remaining 4');
    expect(html).toContain('Reveal answer');
    expect(html).toContain('Question picker');
  });

  it('renders Match/No match and the running score for Zgodności', () => {
    const html = renderToStaticMarkup(
      createElement(GameClickerOverlay, { open: true, game: zgodnosci, onClose: () => {} }),
    );
    expect(html).toContain('Match');
    expect(html).toContain('No match');
    expect(html).toContain('Match score: 0');
    expect(html).toContain('First?');
    expect(html).not.toContain('Reveal answer');
  });

  it('records compatibility results and advances', () => {
    const source = read('src/components/GameClickerOverlay.jsx');
    expect(source).toContain('[current.id]: { id: current.id, isCompatible }');
    expect(source).toContain('setAnswered((state) => ({');
    expect(source).toContain('advance()');
    expect(source).toContain('Object.values(answered).filter((result) => result?.isCompatible === true)');
  });

  it('supports out-of-order override without changing the main order', () => {
    const source = read('src/components/GameClickerOverlay.jsx');
    expect(source).toContain('setOverrideId(item.id)');
    expect(source).toContain('setDisplayId(null)');
    expect(source).toContain('remaining[0]');
    expect(source).toContain('game.levelFilter');
    expect(source).toContain('levelFilter');
  });

  it('handles completion, reset and keyboard shortcuts', () => {
    const source = read('src/components/GameClickerOverlay.jsx');
    expect(source).toContain("t('game.completeTitle')");
    expect(source).toContain("t('game.resetConfirm')");
    expect(source).toContain("event.key === 'ArrowRight'");
    expect(source).toContain("event.key === ' '");
    expect(source).toContain("event.key === 'm'");
    expect(source).toContain("event.key === 'n'");
  });

  it('stays MC-only and localizes every new label', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('<GameClickerOverlay');
    for (const file of [
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/VenueManagerView.jsx',
      'src/components/SpeakerView.jsx',
    ]) {
      expect(read(file), file).not.toContain('GameClickerOverlay');
    }
    for (const file of ['src/i18n/en.js', 'src/i18n/fr.js', 'src/i18n/pl.js']) {
      const source = read(file);
      for (const key of [
        'game.match',
        'game.noMatch',
        'game.counters',
        'game.score',
        'game.picker',
        'game.completeTitle',
        'game.resetConfirm',
        'game.level.EASY',
        'game.level.MEDIUM',
        'game.level.HARD',
      ]) {
        expect(source, `${file} ${key}`).toContain(`'${key}'`);
      }
    }
  });
});
