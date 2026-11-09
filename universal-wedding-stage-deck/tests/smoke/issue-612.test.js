import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  guestRequestStorageKey,
  loadGuestRequest,
  normalizeGuestRequestStatus,
  saveGuestRequest,
} from '../../src/lib/songRequestStatus.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

describe('issue #612 played-song visibility and guest i18n', () => {
  it('strips song and artist from the played status shape', () => {
    expect(
      normalizeGuestRequestStatus({
        id: 'req-1',
        status: 'accepted',
        song: 'Perfect',
        artist: 'Ed Sheeran',
        played_at: '2026-08-20T20:00:00.000Z',
      }),
    ).toMatchObject({ status: 'played', song: '', artist: '' });
  });

  it('does not persist played song text in the guest record', () => {
    const storage = memoryStorage();
    const record = {
      requestId: 'req-1',
      deviceId: 'device-1234',
      song: 'Perfect',
      artist: 'Ed Sheeran',
      status: 'played',
      playedAt: '2026-08-20T20:00:00.000Z',
    };
    expect(saveGuestRequest('abc123', record, { storage })).toBe(true);
    expect(storage.getItem(guestRequestStorageKey('abc123'))).not.toContain('Perfect');
    expect(loadGuestRequest('abc123', { storage })).toMatchObject({
      status: 'played',
      song: '',
      artist: '',
    });
  });

  it('keeps played requests out of the DJ up-next list', () => {
    const queue = read('src/components/DjSongRequestQueue.jsx');
    expect(queue).toContain('accepted.filter((request) => !request.playedAt)');
  });

  it('adds the language switch and localizes request time', () => {
    const app = read('src/components/SongRequestApp.jsx');
    expect(app).toContain('LanguageToggle');
    expect(app).not.toContain("songRequest.playedBody')}\n            song={record.song}");
    const queue = read('src/components/DjSongRequestQueue.jsx');
    expect(queue).toContain('toLocaleTimeString(locale');
  });
});
