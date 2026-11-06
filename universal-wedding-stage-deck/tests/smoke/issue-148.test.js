import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import SongRequestApp from '../../src/components/SongRequestApp.jsx';
import {
  buildSongRequestUrl,
  normalizeSongRequestInput,
  parseSongRequestPath,
  submitSongRequest,
} from '../../src/lib/songRequests.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const config = {
  enabled: true,
  functionsUrl: 'https://example.supabase.co/functions/v1',
  anonKey: 'anon-key',
};

const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

describe('issue #148 public guest song requests', () => {
  it('parses the public request route and room code', () => {
    expect(parseSongRequestPath('/deck/request/abc123', '', '/deck/')).toEqual({
      roomCode: 'abc123',
    });
    expect(parseSongRequestPath('/deck/request', '?room=xyz789', '/deck/')).toEqual({
      roomCode: 'xyz789',
    });
    expect(parseSongRequestPath('/deck/request/not-valid', '', '/deck/')).toBeNull();
    expect(parseSongRequestPath('/deck/admin', '', '/deck/')).toBeNull();
  });

  it('builds an absolute request URL', () => {
    expect(
      buildSongRequestUrl({
        origin: 'https://www.weselnyzabojad.pl',
        baseUrl: '/deck/',
        roomCode: 'abc123',
      }),
    ).toBe('https://www.weselnyzabojad.pl/deck/request/abc123');
  });

  it('validates and trims song and artist only', () => {
    expect(normalizeSongRequestInput({ song: '  Perfect ', artist: ' Ed Sheeran ' })).toEqual({
      ok: true,
      value: { song: 'Perfect', artist: 'Ed Sheeran' },
    });
    expect(normalizeSongRequestInput({ song: '', artist: 'Ed Sheeran' }).ok).toBe(false);
    expect(
      normalizeSongRequestInput({ song: 'x'.repeat(121), artist: 'Ed Sheeran' }).ok,
    ).toBe(false);
    expect(normalizeSongRequestInput({ song: 'Per\nfect', artist: 'Ed Sheeran' }).ok).toBe(
      false,
    );
  });

  it('submits only roomCode, song and artist', async () => {
    let request = null;
    const fetchImpl = async (url, options) => {
      request = { url, options };
      return response(202, { received: true });
    };

    const result = await submitSongRequest({
      config,
      roomCode: 'ABC123',
      song: 'Perfect',
      artist: 'Ed Sheeran',
      fetchImpl,
    });

    expect(result).toEqual({ ok: true });
    expect(request.url).toBe('https://example.supabase.co/functions/v1/submit_song_request');
    expect(JSON.parse(request.options.body)).toEqual({
      roomCode: 'abc123',
      song: 'Perfect',
      artist: 'Ed Sheeran',
    });
    expect(request.options.headers.Authorization).toBe('Bearer anon-key');
  });

  it('returns safe server errors and network failures', async () => {
    const rateLimited = await submitSongRequest({
      config,
      roomCode: 'abc123',
      song: 'Perfect',
      artist: 'Ed Sheeran',
      fetchImpl: async () => response(429, { error: 'Too many requests. Please wait.' }),
    });
    expect(rateLimited).toEqual({ ok: false, error: 'Too many requests. Please wait.' });

    const failed = await submitSongRequest({
      config,
      roomCode: 'abc123',
      song: 'Perfect',
      artist: 'Ed Sheeran',
      fetchImpl: async () => {
        throw new Error('offline');
      },
    });
    expect(failed.ok).toBe(false);
    expect(failed.error).toContain('Check the connection');
  });

  it('renders only the public form when configured', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    const html = renderToStaticMarkup(
      createElement(SongRequestApp, { roomCode: 'abc123' }),
    );
    expect(html).toContain('Request a song');
    expect(html).toContain('Song');
    expect(html).toContain('Artist');
    expect(html).toContain('Send request');
    expect(html).not.toContain('Accept');
    expect(html).not.toContain('Decline');
    vi.unstubAllEnvs();
  });

  it('keeps backend validation, rate limiting and no guest reads', () => {
    const fn = read('supabase/functions/submit_song_request/index.ts');
    expect(fn).toContain('MAX_IP_ATTEMPTS');
    expect(fn).toContain('song_request_attempts');
    expect(fn).toContain('return json({ received: true }, 202)');
    expect(fn).toContain("status: 'pending'");
    expect(fn).not.toContain('select(*');

    const migration = read('supabase/migrations/202611060002_song_requests.sql');
    expect(migration).toContain('enable row level security');
    expect(migration).toContain('revoke all on public.song_requests from anon, authenticated');
    expect(migration).toContain('grant update (status)');
    expect(migration).toContain("status in ('accepted', 'declined')");
  });
});
