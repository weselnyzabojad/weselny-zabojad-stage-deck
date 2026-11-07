import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SpeechesCard from '../../src/components/SpeechesCard.jsx';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #203 hide the MC Speeches card when empty', () => {
  it('renders nothing when the cartridge has no speeches', () => {
    const html = renderToStaticMarkup(
      createElement(SpeechesCard, {
        wedding: { ...DEMO_WEDDING, speeches: [] },
        mode: 'OFF',
        speeches: [],
        activeSpeechId: null,
        onSelect: () => {},
        clock: null,
      }),
    );
    expect(html).toBe('');
  });

  it('renders the card when speeches exist', () => {
    const html = renderToStaticMarkup(
      createElement(SpeechesCard, {
        wedding: DEMO_WEDDING,
        mode: 'COMPLEX',
        speeches: DEMO_WEDDING.speeches,
        activeSpeechId: null,
        onSelect: () => {},
        clock: null,
      }),
    );
    expect(html).toContain('Speeches');
    expect(html).toContain(DEMO_WEDDING.speeches[0].speaker.name);
  });

  it('removes the empty placeholder and guards the MC card', () => {
    const card = read('src/components/SpeechesCard.jsx');
    const mc = read('src/views/McMasterView.jsx');
    expect(card).not.toContain('No speeches captured');
    expect(card).toContain('if (!speeches?.length) return null;');
    expect(mc).toContain('{speeches?.length > 0 ? (');
  });
});
