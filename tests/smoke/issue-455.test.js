import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import SongRequestApp from '../../src/components/SongRequestApp.jsx';
import {
  GUEST_DEVICE_ID_KEY,
  createGuestDeviceId,
  getGuestDeviceId,
} from '../../src/lib/guestDeviceId.js';
import {
  fetchGuestRequestStatus,
  guestRequestStorageKey,
  loadGuestRequest,
  normalizeGuestRequestStatus,
  saveGuestRequest,
  subscribeGuestRequestStatus,
} from '../../src/lib/songRequestStatus.js';
import { submitSongRequest } from '../../src/lib/songRequests.js';

const config = {
  enabled: true,
  functionsUrl: 'https://example.supabase.co/functions/v1',
  anonKey: 'anon-key',
};
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});
const memoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

describe('issue #455 guest song request phone view', () => {
  it('generates a UUID device id and persists it permanently', () => {
    const storage = memoryStorage();
    const cryptoImpl = { randomUUID: () => '11111111-2222-4333-8444-555555555555' };
    const id = getGuestDeviceId({ storage, cryptoImpl });
    expect(id).toBe('11111111-2222-4333-8444-555555555555');
    expect(storage.getItem(GUEST_DEVICE_ID_KEY)).toBe(id);
    expect(getGuestDeviceId({ storage, cryptoImpl: { randomUUID: () => 'different' } })).toBe(id);
  });

  it('falls back to a v4-shaped id without crypto.randomUUID', () => {
    expect(createGuestDeviceId({})).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('persists and restores a pending request record', () => {
    const storage = memoryStorage();
    const record = {
      requestId: 'req-1',
      deviceId: 'device-1234',
      song: 'Perfect',
      artist: 'Ed Sheeran',
      status: 'pending',
      submittedAt: '2026-08-20T18:00:00.000Z',
    };
    expect(saveGuestRequest('abc123', record, { storage })).toBe(true);
    expect(storage.getItem(guestRequestStorageKey('abc123'))).toContain('req-1');
    expect(loadGuestRequest('abc123', { storage })).toEqual(record);
  });

  it('maps accepted plus played_at to the played phase', () => {
    expect(
      normalizeGuestRequestStatus({
        id: 'req-1',
        status: 'accepted',
        song: 'Perfect',
        artist: 'Ed Sheeran',
        played_at: '2026-08-20T20:00:00.000Z',
      }),
    ).toMatchObject({ status: 'played', playedAt: '2026-08-20T20:00:00.000Z' });
  });

  it('fetches only the guest request status for the device', async () => {
    let request = null;
    const fetchImpl = async (url, options) => {
      request = { url, options };
      return response(200, {
        request: { id: 'req-1', status: 'accepted', song: 'Perfect', artist: 'Ed Sheeran' },
      });
    };
    const result = await fetchGuestRequestStatus({
      config,
      roomCode: 'abc123',
      requestId: 'req-1',
      deviceId: 'device-1234',
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    expect(result.request.status).toBe('accepted');
    expect(request.url).toBe('https://example.supabase.co/functions/v1/get_song_request_status');
    expect(JSON.parse(request.options.body)).toEqual({
      roomCode: 'abc123',
      requestId: 'req-1',
      device_id: 'device-1234',
    });
  });

  it('rejects a response for another request id', async () => {
    const result = await fetchGuestRequestStatus({
      config,
      roomCode: 'abc123',
      requestId: 'req-1',
      deviceId: 'device-1234',
      fetchImpl: async () => response(200, { id: 'req-2', status: 'accepted' }),
    });
    expect(result.ok).toBe(false);
  });

  it('surfaces the 429 retry window from submit', async () => {
    const result = await submitSongRequest({
      config,
      roomCode: 'abc123',
      song: 'Perfect',
      artist: 'Ed Sheeran',
      deviceId: 'device-1234',
      fetchImpl: async () => response(429, { retryAfterSeconds: 301, error: 'Cooldown' }),
    });
    expect(result).toMatchObject({ ok: false, code: 'cooldown', retryAfterMinutes: 6 });
  });

  it('polls the status endpoint without a manual refresh', async () => {
    const updates = [];
    let intervalCallback = null;
    const unsubscribe = subscribeGuestRequestStatus({
      config,
      roomCode: 'abc123',
      requestId: 'req-1',
      deviceId: 'device-1234',
      onUpdate: (request) => updates.push(request.status),
      fetchImpl: async () => response(200, { id: 'req-1', status: 'accepted' }),
      setIntervalImpl: (callback) => {
        intervalCallback = callback;
        return 1;
      },
      clearIntervalImpl: () => {
        intervalCallback = null;
      },
    });
    await vi.waitFor(() => expect(updates).toContain('accepted'));
    expect(typeof intervalCallback).toBe('function');
    unsubscribe();
    expect(intervalCallback).toBeNull();
  });

  it('renders the public form with an online/offline aware send button', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    const html = renderToStaticMarkup(
      createElement(SongRequestApp, { roomCode: 'abc123' }),
    );
    expect(html).toContain('Request a song');
    expect(html).toContain('Artist');
    expect(html).toContain('Song');
    expect(html).toContain('Send request');
    expect(html).toContain('Checking the connection');
    expect(html).not.toContain('Accept');
    expect(html).not.toContain('Decline');
    vi.unstubAllEnvs();
  });

  it('warns before unload and listens for the connection returning', () => {
    const app = read('src/components/SongRequestApp.jsx');
    expect(app).toContain('beforeunload');
    expect(app).toContain("addEventListener('online'");
    expect(app).toContain('getGuestDeviceId');
    expect(app).toContain('deviceId');
  });
});
