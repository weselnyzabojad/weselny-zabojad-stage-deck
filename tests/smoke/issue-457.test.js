import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SongRequestModerationList } from '../../src/components/DjSongRequestQueue.jsx';
import { subscribeSongRequestChanges } from '../../src/lib/songRequestQueue.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const rows = [
  { id: '1', song: 'Pending Song', artist: 'Artist A', status: 'pending', created_at: '2026-01-01T20:00:00Z' },
  { id: '2', song: 'Accepted Song', artist: 'Artist B', status: 'accepted', created_at: '2026-01-01T20:01:00Z' },
  { id: '3', song: 'Denied Song', artist: 'Artist C', status: 'declined', created_at: '2026-01-01T20:02:00Z' },
  {
    id: '4',
    song: 'Played Song',
    artist: 'Artist D',
    status: 'accepted',
    played_at: '2026-01-01T20:03:00Z',
    created_at: '2026-01-01T20:03:00Z',
  },
];

describe('issue #457 DJ VIP song request moderation', () => {
  it('shows pending and accepted requests, never denied or already played', () => {
    const pendingHtml = renderToStaticMarkup(
      createElement(SongRequestModerationList, { requests: rows, tab: 'pending' }),
    );
    const acceptedHtml = renderToStaticMarkup(
      createElement(SongRequestModerationList, { requests: rows, tab: 'accepted' }),
    );
    expect(pendingHtml).toContain('Pending Song');
    expect(acceptedHtml).toContain('Accepted Song');
    for (const html of [pendingHtml, acceptedHtml]) {
      expect(html).not.toContain('Denied Song');
      expect(html).not.toContain('Played Song');
    }
  });

  it('offers accessible Accept, Deny and Played actions', () => {
    const pendingHtml = renderToStaticMarkup(
      createElement(SongRequestModerationList, { requests: rows, tab: 'pending' }),
    );
    const acceptedHtml = renderToStaticMarkup(
      createElement(SongRequestModerationList, { requests: rows, tab: 'accepted' }),
    );
    expect(pendingHtml).toContain('aria-label="Accept Pending Song"');
    expect(pendingHtml).toContain('aria-label="Deny Pending Song"');
    expect(acceptedHtml).toContain('aria-label="Mark Accepted Song as played"');
  });

  it('renders the empty pending and accepted states', () => {
    const pendingHtml = renderToStaticMarkup(
      createElement(SongRequestModerationList, { requests: [], tab: 'pending' }),
    );
    const acceptedHtml = renderToStaticMarkup(
      createElement(SongRequestModerationList, { requests: [], tab: 'accepted' }),
    );
    expect(pendingHtml).toContain('No pending guest requests');
    expect(acceptedHtml).toContain('No accepted songs waiting');
  });

  it('subscribes to realtime changes and keeps the polling fallback', () => {
    const source = read('src/components/DjSongRequestQueue.jsx');
    expect(source).toContain('subscribeSongRequestChanges');
    expect(source).toContain('setInterval(load, 30000)');
    expect(source).toContain('markSongRequestPlayed');
    expect(source).toContain('setRequests(snapshot)');
    expect(read('src/lib/songRequestQueue.js')).toContain("'postgres_changes'");
  });

  it('mounts the queue only for DJ VIP', () => {
    const dj = read('src/components/DjBoothView.jsx');
    const matches = dj.match(/\{caps\.guestRequests \? \(\s*<DjSongRequestQueue/g) ?? [];
    expect(matches).toHaveLength(2);
  });

  it('localizes every moderation label', () => {
    for (const file of ['src/i18n/en.js', 'src/i18n/fr.js', 'src/i18n/pl.js']) {
      const source = read(file);
      for (const key of [
        'dj.requests.accept',
        'dj.requests.deny',
        'dj.requests.played',
        'dj.requests.pendingHeading',
        'dj.requests.acceptedHeading',
        'dj.requests.error',
      ]) {
        expect(source, `${file} ${key}`).toContain(`'${key}'`);
      }
    }
  });

  it('returns a no-op unsubscribe without a connected client', () => {
    const unsubscribe = subscribeSongRequestChanges({ config: { enabled: false } });
    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });
});
