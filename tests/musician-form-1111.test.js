import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MusicianSuggestionForm from '../src/components/MusicianSuggestionForm.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const suggestions = [
  {
    id: 's1',
    song: 'Perfect',
    artist: 'Ed Sheeran',
    note: 'After the toast',
    step_id: 'first_dance',
    status: 'pending',
  },
  { id: 's2', song: 'Canon in D', artist: 'Pachelbel', status: 'played' },
];

const timeline = [{ step: { id: 'first_dance', title: 'First Dance', time: '21:45' } }];

const render = () =>
  renderToStaticMarkup(
    createElement(MusicianSuggestionForm, {
      suggestions,
      timeline,
      onCreate: async () => {},
      onUpdate: async () => {},
      onDelete: async () => {},
    }),
  );

describe('issue #1111 musician suggestion form', () => {
  it('renders song, artist, moment, note and advisory lookup', () => {
    const html = render();
    expect(html).toContain('Suggest a song to the DJ');
    expect(html).toContain('Song');
    expect(html).toContain('Artist');
    expect(html).toContain('Moment');
    expect(html).toContain('First Dance');
    expect(html).toContain('Find metadata');
  });

  it('lists own pending suggestions with edit/delete', () => {
    const html = render();
    expect(html).toContain('Perfect');
    expect(html).toContain('After the toast');
    expect(html).toContain('Edit');
    expect(html).toContain('Delete');
  });

  it('keeps played history collapsed and read-only', () => {
    const html = render();
    expect(html).toContain('<details');
    expect(html).toContain('Played (1)');
    expect(html).toContain('Canon in D');
  });

  it('wires the form into the Musician view with the role token', () => {
    const view = read('src/components/MusicianView.jsx');
    const deck = read('src/StageDeck.jsx');
    const sync = read('src/lib/sync/supabaseSyncClient.js');
    expect(view).toContain('<MusicianSuggestionForm');
    expect(view).toContain('useMusicianSuggestions');
    expect(view).toContain('accessToken,');
    expect(deck).toContain('accessToken={sessionValid ? roleSession?.token ?? null : null}');
    expect(sync).toContain('createMusicianSuggestion');
    expect(sync).toContain('updateMusicianSuggestion');
    expect(sync).toContain('deleteMusicianSuggestion');
  });
});
