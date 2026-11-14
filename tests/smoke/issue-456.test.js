import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  fetchSongRequests,
  markSongRequestPlayed,
  normalizeSongRequestRow,
} from '../../src/lib/songRequestQueue.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const config = {
  enabled: true,
  url: 'https://example.supabase.co',
  anonKey: 'anon-key',
};
const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

describe('issue #456 song request backend lifecycle', () => {
  it('adds device_id, played_at and the cooldown/queue indexes', () => {
    const migration = read('supabase/migrations/202611090001_song_request_lifecycle.sql');
    const schema = read('supabase/schema.sql');
    for (const sql of [migration, schema]) {
      expect(sql).toContain('device_id');
      expect(sql).toContain('played_at');
      expect(sql).toContain('song_requests_device_cooldown_idx');
      expect(sql).toContain('(wedding_id, device_id, created_at desc)');
      expect(sql).toContain('song_requests_queue_state_idx');
    }
    expect(migration).toContain('grant update (played_at)');
    expect(schema).toContain('grant update (status, played_at)');
  });

  it('enforces a 10-minute per-device cooldown and returns the request id', () => {
    const fn = read('supabase/functions/submit_song_request/index.ts');
    expect(fn).toContain('DEVICE_COOLDOWN_MS = 10 * 60 * 1000');
    expect(fn).toContain('DEVICE_ID_PATTERN');
    expect(fn).toContain("'invalid_device'");
    expect(fn).toContain("eq('device_id', deviceId)");
    expect(fn).toContain('retryAfterSeconds');
    expect(fn).toContain('retryAfterMinutes');
    expect(fn).toContain("requestId: inserted.id");
    expect(fn).toContain("status: 'pending'");
    expect(fn).toContain("device_id: deviceId");
  });

  it('serves only the matching device request from the status function', () => {
    const fn = read('supabase/functions/get_song_request_status/index.ts');
    expect(fn).toContain('.eq(\'id\', requestId)');
    expect(fn).toContain('.eq(\'wedding_id\', wedding.wedding_id)');
    expect(fn).toContain('.eq(\'device_id\', deviceId)');
    expect(fn).toContain("select('id, song, artist, status, played_at')");
    expect(fn).not.toContain('select(*');
  });

  it('keeps anon guests out of the table', () => {
    const schema = read('supabase/schema.sql');
    expect(schema).toContain('revoke all on public.song_requests from anon, authenticated');
    expect(schema).not.toMatch(/grant\s+select\s+on\s+public\.song_requests\s+to\s+anon/i);
  });

  it('loads device and played fields into the DJ queue shape', async () => {
    let requestedUrl = '';
    const result = await fetchSongRequests({
      config,
      accessToken: 'token',
      fetchImpl: async (url) => {
        requestedUrl = url;
        return response(200, [
          {
            id: 'req-1',
            song: 'Perfect',
            artist: 'Ed Sheeran',
            status: 'accepted',
            device_id: 'device-1234',
            played_at: '2026-08-20T20:00:00.000Z',
            created_at: '2026-08-20T19:00:00.000Z',
          },
        ]);
      },
    });
    expect(requestedUrl).toContain('device_id,played_at');
    expect(normalizeSongRequestRow(result.requests[0])).toMatchObject({
      deviceId: 'device-1234',
      playedAt: '2026-08-20T20:00:00.000Z',
    });
  });

  it('marks an accepted request as played without changing its status', async () => {
    let request = null;
    const result = await markSongRequestPlayed({
      config,
      accessToken: 'token',
      id: 'req-1',
      playedAt: '2026-08-20T20:00:00.000Z',
      fetchImpl: async (url, options) => {
        request = { url, options };
        return response(200, [{
          id: 'req-1',
          song: 'Perfect',
          artist: 'Ed Sheeran',
          status: 'accepted',
          played_at: '2026-08-20T20:00:00.000Z',
        }]);
      },
    });
    expect(result.ok).toBe(true);
    expect(request.url).toContain('status=eq.accepted');
    expect(request.url).toContain('played_at=is.null');
    expect(JSON.parse(request.options.body)).toEqual({
      played_at: '2026-08-20T20:00:00.000Z',
    });
    expect(request.options.body).not.toContain('declined');
  });

  it('normalizes null backfill rows safely', () => {
    expect(
      normalizeSongRequestRow({
        id: 'req-1',
        song: 'Perfect',
        artist: 'Ed Sheeran',
        status: 'pending',
        device_id: null,
        played_at: null,
      }),
    ).toMatchObject({ deviceId: null, playedAt: null });
  });

  it('documents deployment order and required secrets', () => {
    const docs = read('docs/admin-setup-and-secrets.md');
    expect(docs).toContain('202611090001_song_request_lifecycle.sql');
    expect(docs).toContain('supabase functions deploy get_song_request_status');
    expect(docs).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });
});
