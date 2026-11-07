import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TopBarClock from '../../src/components/TopBarClock.jsx';

const clock = {
  nowClock: '18:42:07',
  projectedFinish: '23:30',
  active: { elapsedSec: 1200, title: 'Dinner' },
  djCutoff: { label: '20:15', inSec: 300 },
};

describe('issue #186 enlarged top-bar clock', () => {
  it('renders the current time larger and in tabular numerals', () => {
    const html = renderToStaticMarkup(createElement(TopBarClock, { clock }));
    expect(html).toContain('18:42:07');
    expect(html).toContain('text-2xl');
    expect(html).toContain('tabular-nums');
  });

  it('keeps the clock to HH:MM:SS only', () => {
    const html = renderToStaticMarkup(createElement(TopBarClock, { clock }));
    expect(html).not.toContain('23:30');
    expect(html).not.toContain('Dinner');
    expect(html).not.toContain('20:15');
  });

  it('renders nothing when no current time is available', () => {
    expect(renderToStaticMarkup(createElement(TopBarClock, { clock: null }))).toBe('');
  });
});
