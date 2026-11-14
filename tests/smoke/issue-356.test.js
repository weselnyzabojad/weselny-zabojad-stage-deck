import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CakeCard from '../../src/components/CakeCard.jsx';

const cake = {
  hasData: true,
  time: '20:30',
  song: 'Cake — The Coup',
  sparklers: true,
  photographerCue: 'Front-left of the cake table',
  stepId: 'step_05',
  state: 'active',
};

describe('issue #356 cake protocol time removal', () => {
  it('removes cutting and serving time from the desktop card', () => {
    const html = renderToStaticMarkup(createElement(CakeCard, { cake }));
    expect(html).not.toContain('Cutting time');
    expect(html).not.toContain('Serve time');
    expect(html).not.toContain('20:30');
  });

  it('removes the compact time readout', () => {
    const html = renderToStaticMarkup(createElement(CakeCard, { cake, compact: true }));
    expect(html).not.toContain('20:30');
    expect(html).not.toContain('Cutting time');
  });

  it('keeps the song and green sparklers, without the photographer cue or ON AIR', () => {
    const html = renderToStaticMarkup(createElement(CakeCard, { cake }));
    expect(html).toContain('Cake — The Coup');
    expect(html).toContain('Sparklers ON');
    expect(html).toContain('bg-tone-positive-bg');
    expect(html).not.toContain('Front-left of the cake table');
    expect(html).not.toContain('ON AIR');
    expect(html).not.toContain('📷');
  });

  it('keeps the other schedule states', () => {
    const html = renderToStaticMarkup(
      createElement(CakeCard, { cake: { ...cake, state: 'done' } }),
    );
    expect(html).toContain('DONE');
  });

  it('hides the sparkler chip when false or unknown', () => {
    for (const sparklers of [false, undefined, null]) {
      const html = renderToStaticMarkup(
        createElement(CakeCard, { cake: { ...cake, sparklers } }),
      );
      expect(html).not.toContain('Sparklers');
    }
  });
});
