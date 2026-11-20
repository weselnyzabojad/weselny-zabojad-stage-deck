import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { searchSongMetadata } from '../../src/lib/songRequests.js';
import en from '../../src/i18n/en.js';
import fr from '../../src/i18n/fr.js';
import pl from '../../src/i18n/pl.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');
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

describe('issue #459 advisory song metadata validation', () => {
  it('posts only the song and artist to the project proxy and normalizes suggestions', async () => {
    let request = null;
    const result = await searchSongMetadata({
      config,
      song: '  Perfect ',
      artist: ' Ed Sheeran ',
      fetchImpl: async (url, options) => {
        request = { url, options };
        return response(200, {
          suggestions: [
            {
              title: 'Perfect',
              artist: 'Ed Sheeran',
              album: '÷',
              artworkUrl100: 'https://example.test/art.jpg',
              previewUrl: 'https://example.test/preview.m4a',
              trackId: 1,
            },
          ],
        });
      },
    });

    expect(result).toEqual({
      ok: true,
      suggestions: [{ title: 'Perfect', artist: 'Ed Sheeran', album: '÷' }],
    });
    expect(request.url).toBe('https://example.supabase.co/functions/v1/search_song_metadata');
    expect(JSON.parse(request.options.body)).toEqual({
      song: 'Perfect',
      artist: 'Ed Sheeran',
    });
    expect(request.options.headers.Authorization).toBe('Bearer anon-key');
    expect(request.options.body).not.toContain('artwork');
    expect(request.options.body).not.toContain('preview');
  });

  it('keeps lookup failures advisory and never throws', async () => {
    const unavailable = await searchSongMetadata({
      config,
      song: 'Perfect',
      artist: 'Ed Sheeran',
      fetchImpl: async () => response(429, { error: 'Too many lookups.' }),
    });
    expect(unavailable).toEqual({ ok: false, unavailable: true, suggestions: [] });

    const offline = await searchSongMetadata({
      config,
      song: 'Perfect',
      artist: 'Ed Sheeran',
      fetchImpl: async () => {
        throw new Error('offline');
      },
    });
    expect(offline).toEqual({ ok: false, unavailable: true, suggestions: [] });

    const aborted = await searchSongMetadata({
      config,
      song: 'Perfect',
      artist: 'Ed Sheeran',
      fetchImpl: async () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        throw error;
      },
    });
    expect(aborted).toEqual({ ok: false, aborted: true, suggestions: [] });
  });

  it('skips the network for a one-character query', async () => {
    let called = false;
    const result = await searchSongMetadata({
      config,
      song: 'P',
      artist: '',
      fetchImpl: async () => {
        called = true;
        return response(200, { suggestions: [] });
      },
    });
    expect(result).toEqual({ ok: true, suggestions: [] });
    expect(called).toBe(false);
  });

  it('renders advisory suggestions without blocking submit', () => {
    const app = read('src/components/SongRequestApp.jsx');

    expect(app).toContain("t('songRequest.suggestionsTitle')");
    expect(app).toContain("t('songRequest.suggestionsHint')");
    expect(app).toContain("t('songRequest.lookupNoMatch')");
    expect(app).toContain("t('songRequest.lookupUnavailable')");
    expect(app).toContain('searchSongMetadata');
    expect(app).toContain('setTimeout');
    expect(app).toContain('AbortController');
    expect(app).toContain('disabled={preview || sending || offline}');
    expect(app).toContain('required');
  });

  it('uses a server-side iTunes/MusicBrainz proxy with cache and rate limits', () => {
    const fn = read('supabase/functions/search_song_metadata/index.ts');

    expect(fn).toContain('https://itunes.apple.com/search');
    expect(fn).toContain('https://musicbrainz.org/ws/2/recording');
    expect(fn).toContain('MUSICBRAINZ_USER_AGENT');
    expect(fn).toContain('WeselnyZabojadStageDeck/1.0');
    expect(fn).toContain('CACHE_TTL_MS = 15 * 60 * 1000');
    expect(fn).toContain('RATE_MAX_REQUESTS = 20');
    expect(fn).toContain('MUSICBRAINZ_MIN_INTERVAL_MS = 1100');
    expect(fn).toContain('AbortSignal.timeout');
    expect(fn).toContain('suggestions: []');
    expect(fn).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(fn).not.toContain('artworkUrl');
    expect(fn).not.toContain('previewUrl');
  });

  it('ships the suggestion labels in every locale', () => {
    for (const dictionary of [fr, pl, en]) {
      expect(dictionary['songRequest.suggestionsTitle'].trim()).not.toBe('');
      expect(dictionary['songRequest.suggestionsHint'].trim()).not.toBe('');
      expect(dictionary['songRequest.lookingUp'].trim()).not.toBe('');
      expect(dictionary['songRequest.lookupNoMatch'].trim()).not.toBe('');
      expect(dictionary['songRequest.lookupUnavailable'].trim()).not.toBe('');
    }
  });

  it('documents the privacy/UX/API contract before deployment', () => {
    const doc = read('docs/song-metadata-validation.md');

    expect(doc).toContain('Privacy and UX contract');
    expect(doc).toContain('iTunes Search API');
    expect(doc).toContain('MusicBrainz');
    expect(doc).toContain('supabase functions deploy search_song_metadata');
    expect(doc).toContain('never block');
    expect(doc).toContain('No audio upload');
  });
});
