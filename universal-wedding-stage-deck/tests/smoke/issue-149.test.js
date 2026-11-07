import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DjSongRequestQueue, {
  SongRequestQueueList,
} from '../../src/components/DjSongRequestQueue.jsx';
import {
  canModerateSongRequests,
  fetchSongRequests,
  partitionSongRequests,
  updateSongRequestStatus,
} from '../../src/lib/songRequestQueue.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const config = {
  enabled: true,
  url: 'https://example.supabase.co',
  anonKey: 'anon-key',
};

const rows = [
  { id: '3', song: 'Later', artist: 'Artist C', status: 'pending', created_at: '2026-01-01T20:02:00Z' },
  { id: '1', song: 'First', artist: 'Artist A', status: 'pending', created_at: '2026-01-01T20:00:00Z' },
  { id: '2', song: 'Yes', artist: 'Artist B', status: 'accepted', created_at: '2026-01-01T20:01:00Z' },
  { id: '4', song: 'No', artist: 'Artist D', status: 'declined', created_at: '2026-01-01T20:03:00Z' },
  { id: 'bad', song: 'Ignored', artist: 'Unknown', status: 'other', created_at: null },
];

const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

describe('issue #149 VIP song request queue', () => {
  it('partitions pending, accepted and declined requests without overlap', () => {
    const queue = partitionSongRequests(rows);
    expect(queue.pending.map((row) => row.id)).toEqual(['1', '3']);
    expect(queue.accepted.map((row) => row.id)).toEqual(['2']);
    expect(queue.declined.map((row) => row.id)).toEqual(['4']);
  });

  it('allows only MC and DJ roles to moderate', () => {
    expect(canModerateSongRequests('mc')).toBe(true);
    expect(canModerateSongRequests('dj')).toBe(true);
    expect(canModerateSongRequests('photo')).toBe(false);
    expect(canModerateSongRequests('speaker')).toBe(false);
  });

  it('loads requests with the role token', async () => {
    let request = null;
    const result = await fetchSongRequests({
      config,
      accessToken: 'role-token',
      fetchImpl: async (url, options) => {
        request = { url, options };
        return response(200, rows);
      },
    });
    expect(result.ok).toBe(true);
    expect(result.requests).toHaveLength(5);
    expect(request.url).toContain('/rest/v1/song_requests?');
    expect(request.options.headers.Authorization).toBe('Bearer role-token');
  });

  it('accepts a pending request without sending other fields', async () => {
    let request = null;
    const result = await updateSongRequestStatus({
      config,
      accessToken: 'role-token',
      id: '1',
      status: 'accepted',
      fetchImpl: async (url, options) => {
        request = { url, options };
        return response(200, [{ ...rows[1], status: 'accepted' }]);
      },
    });
    expect(result.ok).toBe(true);
    expect(result.request.status).toBe('accepted');
    expect(request.options.method).toBe('PATCH');
    expect(request.url).toContain('id=eq.1');
    expect(request.url).toContain('status=eq.pending');
    expect(JSON.parse(request.options.body)).toEqual({ status: 'accepted' });
  });

  it('reports an already-handled request', async () => {
    const result = await updateSongRequestStatus({
      config,
      accessToken: 'role-token',
      id: '1',
      status: 'declined',
      fetchImpl: async () => response(200, []),
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('already handled');
  });

  it('renders pending requests and keeps declined outcomes separate', () => {
    const html = renderToStaticMarkup(
      createElement(SongRequestQueueList, {
        requests: rows,
        requestUrl: 'https://example.com/deck/request/abc123',
      }),
    );
    expect(html).toContain('Guest requests');
    expect(html).toContain('2 pending');
    expect(html).toContain('First');
    expect(html).toContain('Later');
    expect(html).toContain('Accept');
    expect(html).toContain('Decline');
    expect(html).toContain('Guest request QR');
    expect(html).toContain('Accepted');
    expect(html).toContain('Declined');
    expect(html).toContain('Yes');
    expect(html).toContain('No');
  });

  it('does not mount for Standard or non-moderator roles', () => {
    expect(
      renderToStaticMarkup(
        createElement(DjSongRequestQueue, {
          enabled: false,
          role: 'dj',
          accessToken: 'role-token',
          roomCode: 'abc123',
        }),
      ),
    ).toBe('');
    expect(
      renderToStaticMarkup(
        createElement(DjSongRequestQueue, {
          enabled: true,
          role: 'photo',
          accessToken: 'role-token',
          roomCode: 'abc123',
        }),
      ),
    ).toBe('');
  });

  it('adds the VIP request bar to desktop and pocket', () => {
    const source = read('src/components/DjBoothView.jsx');
    const compact = source.slice(
      source.indexOf('const compactContent'),
      source.indexOf('const wideContent'),
    );
    const wide = source.slice(source.indexOf('const wideContent'));

    expect(compact).toContain('variant="bar"');
    expect(wide).toContain('variant="bar"');
    expect(wide).not.toContain('<SongRequestQueueList');
  });
});
