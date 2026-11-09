import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GamesCueCard from '../../src/components/GamesCueCard.jsx';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

const render = (props) => renderToStaticMarkup(
  createElement(GamesCueCard, { wedding: DEMO_WEDDING, role: 'mc', ...props }),
);

describe('issue #530 MC game card heading', () => {
  it('uses Test Wiedzy as the single card heading', () => {
    const html = render({ gameId: 'test_wiedzy' });
    expect(html).toContain('🎲 Test Wiedzy');
    expect(html).not.toContain('>Games<');
    expect((html.match(/Test Wiedzy/g) ?? []).length).toBe(1);
    expect(html).toContain('3 questions');
  });

  it('uses Test Zgodności as the single card heading', () => {
    const html = render({ gameId: 'test_zgodnosci' });
    expect(html).toContain('🎲 Test Zgodności');
    expect(html).not.toContain('>Games<');
    expect((html.match(/Test Zgodności/g) ?? []).length).toBe(1);
    expect(html).toContain('questions');
  });

  it('keeps the safe unavailable state for the selected game', () => {
    const wedding = {
      games: {
        enabled: true,
        questionLists: [
          {
            id: 'test_wiedzy',
            title: 'Test Wiedzy',
            gameType: 'TEST_WIEDZY',
            status: 'MISSING',
            questions: [],
          },
        ],
      },
    };
    const html = renderToStaticMarkup(
      createElement(GamesCueCard, { wedding, role: 'mc', gameId: 'test_wiedzy' }),
    );
    expect(html).toContain('🎲 Test Wiedzy');
    expect(html).toContain('Questions unavailable');
    expect(html).toContain('Question list could not be loaded');
  });

  it('keeps the generic Games heading for the multi-list fallback', () => {
    const html = render({});
    expect(html).toContain('🎲 Games');
    expect(html).toContain('Test Wiedzy');
    expect(html).toContain('Test Zgodności');
  });

  it('renders nothing outside MC', () => {
    expect(render({ gameId: 'test_wiedzy', role: 'dj' })).toBe('');
    expect(render({ gameId: 'test_wiedzy', role: 'speaker' })).toBe('');
  });
});
