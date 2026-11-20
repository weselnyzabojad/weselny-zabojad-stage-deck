import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MusicianPreferredMusic from '../src/components/MusicianPreferredMusic.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const suggestions = [
  {
    id: 's1',
    musician_id: 'm1',
    song: 'Perfect',
    artist: 'Ed Sheeran',
    note: 'For the first dance',
    step_id: 'first_dance',
    status: 'pending',
  },
  {
    id: 's2',
    musician_id: 'm1',
    song: 'Canon in D',
    artist: 'Pachelbel',
    status: 'played',
  },
];

const musicians = [{ id: 'm1', name: 'Anna', instrument: 'violin' }];
const timeline = [{ step: { id: 'first_dance', title: 'First Dance' } }];
const mainSongs = [{ title: 'Perfect', artist: 'Ed Sheeran' }];

const render = (props = {}) =>
  renderToStaticMarkup(
    createElement(MusicianPreferredMusic, {
      suggestions,
      musicians,
      timeline,
      mainSongs,
      onMarkPlayed: () => {},
      ...props,
    }),
  );

describe('issue #1098 musician preferred music panel', () => {
  it('shows pending suggestions with author, instrument and step', () => {
    const html = render();
    expect(html).toContain('Musician’s preferred music');
    expect(html).toContain('Perfect');
    expect(html).toContain('Anna');
    expect(html).toContain('Violin');
    expect(html).toContain('First Dance');
    expect(html).toContain('Mark played');
  });

  it('warns about a duplicate main song without hiding the row', () => {
    const html = render();
    expect(html).toContain('Already in main songs');
    expect(html).toContain('Perfect');
  });

  it('keeps played suggestions in a collapsed history', () => {
    const html = render();
    expect(html).toContain('<details');
    expect(html).toContain('Played (1)');
    expect(html).toContain('Canon in D');
  });

  it('shows a localized empty state', () => {
    const html = render({ suggestions: [] });
    expect(html).toContain('No musician suggestions yet.');
    expect(html).not.toContain('Mark played');
  });

  it('wires the panel into the DJ VIP view and moves must-play to main songs', () => {
    const view = read('src/components/DjBoothView.jsx');
    expect(view).toContain('<MusicianPreferredMusic');
    expect(view).toContain('useMusicianSuggestions');
    expect(view).toContain("const futureFooter = caps.vip ?");
    expect(view).toContain('mainSongRows.length > 0 || mustPlayRows.length > 0');
    const sync = read('src/lib/sync/supabaseSyncClient.js');
    expect(sync).toContain('fetchMusicianSuggestions');
    expect(sync).toContain('markMusicianSuggestionPlayed');
    expect(sync).toContain('subscribeMusicianSuggestions');
  });
});
