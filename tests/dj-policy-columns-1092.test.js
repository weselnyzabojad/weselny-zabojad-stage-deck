import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TimelineFocusStack from '../src/components/TimelineFocusStack.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const render = (element) => renderToStaticMarkup(element);

const timeline = [
  {
    index: 0,
    step: { id: 's1', title: 'Dinner', type: 'FLEXIBLE', durationMin: 15 },
    isActive: true,
    isDone: false,
    projectedStart: '16:00',
    projectedEnd: '16:15',
  },
];

describe('issue #1092 DJ policy columns', () => {
  it('renders the history and future footer slots under their columns', () => {
    const html = render(
      createElement(TimelineFocusStack, {
        entries: timeline,
        activeIndex: 0,
        historyFooter: createElement('span', { 'data-testid': 'history-footer' }, 'main songs'),
        futureFooter: createElement('span', { 'data-testid': 'future-footer' }, 'must and dont'),
      }),
    );
    expect(html).toContain('data-testid="history-footer"');
    expect(html).toContain('data-testid="future-footer"');
    expect(html).toContain('main songs');
    expect(html).toContain('must and dont');
  });

  it('wires main songs left, must/dont right and the notepad center', () => {
    const dj = read('src/components/DjBoothView.jsx');
    const history = dj.slice(dj.indexOf('const historyFooter'), dj.indexOf('const futureFooter'));
    const future = dj.slice(dj.indexOf('const futureFooter'), dj.indexOf('const currentColumnFooter'));
    const current = dj.slice(dj.indexOf('const currentColumnFooter'), dj.indexOf('// Extra current-card'));

    expect(history).toContain('<MainSongPills');
    expect(history).toContain('mainSongRows.length > 0');
    expect(future).toContain('<MustPlayPills');
    expect(future).toContain('<DoNotPlayPills');
    expect(future).toContain('mustPlayRows.length > 0');
    expect(future).toContain('doNotPlayRows.length > 0');
    expect(current).toContain('<DjSetNotesNotepad');
    expect(current).toContain('{vendorPresence}');
    expect(dj).toContain('historyFooter={historyFooter}');
    expect(dj).toContain('currentFooter={currentColumnFooter}');
    expect(dj).toContain('futureFooter={futureFooter}');
  });

  it('leaves the compact layout on the single policy card', () => {
    const dj = read('src/components/DjBoothView.jsx');
    const compact = dj.slice(dj.indexOf('const compactContent'), dj.indexOf('const wideContent'));
    expect(compact).toContain('<MusicPolicyCard policy={musicPolicy} />');
    expect(compact).toContain('currentFooter={vendorPresence}');
    expect(compact).not.toContain('historyFooter=');
    expect(compact).not.toContain('futureFooter=');
    expect(compact).not.toContain('DjSetNotesNotepad');
  });
});
