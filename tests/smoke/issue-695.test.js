import { describe, expect, it, vi } from 'vitest';
import {
  GOLDEN_HOUR_MINUTES_BEFORE_SUNSET,
  SUNSET_ENDPOINT,
  applySunsetSnapshot,
  buildSunsetSnapshot,
  fetchSunsetSnapshot,
  sunsetLookupUrl,
} from '../../src/lib/sunsetLookup.js';

const results = {
  sunset: '2026-08-20T18:12:00+00:00',
  civil_twilight_end: '2026-08-20T18:48:00+00:00',
};
const now = new Date('2026-08-20T17:05:00.000Z');
const timeZone = 'Europe/Warsaw';

describe('issue #695 application-owned sunset snapshot', () => {
  it('builds the documented sunrise-sunset.org URL', () => {
    const url = new URL(
      sunsetLookupUrl({ latitude: 51.05, longitude: 16.19, dateISO: '2026-08-20' }),
    );
    expect(`${url.origin}${url.pathname}`).toBe(SUNSET_ENDPOINT);
    expect(url.searchParams.get('lat')).toBe('51.05');
    expect(url.searchParams.get('lng')).toBe('16.19');
    expect(url.searchParams.get('date')).toBe('2026-08-20');
    expect(url.searchParams.get('formatted')).toBe('0');
  });

  it('maps one API response into the event-local snapshot', () => {
    expect(GOLDEN_HOUR_MINUTES_BEFORE_SUNSET).toBe(40);
    expect(
      buildSunsetSnapshot({ results, latitude: 51.05, longitude: 16.19, now, timeZone }),
    ).toEqual({
      provider: 'sunrise-sunset.org',
      latitude: 51.05,
      longitude: 16.19,
      lastFetchedAt: '2026-08-20T17:05:00.000Z',
      sunsetTime: '20:12',
      goldenHourStart: '19:32',
      civilTwilightEnd: '20:48',
      status: 'LIVE',
    });
  });

  it('returns UNAVAILABLE when the API fails or coordinates are missing', async () => {
    const failed = vi.fn().mockResolvedValue({ ok: false });
    expect(
      await fetchSunsetSnapshot({
        latitude: 51.05,
        longitude: 16.19,
        dateISO: '2026-08-20',
        fetchImpl: failed,
      }),
    ).toEqual({ provider: 'sunrise-sunset.org', status: 'UNAVAILABLE' });

    const noCoords = vi.fn();
    expect(
      await fetchSunsetSnapshot({ dateISO: '2026-08-20', fetchImpl: noCoords }),
    ).toEqual({ provider: 'sunrise-sunset.org', status: 'UNAVAILABLE' });
    expect(noCoords).not.toHaveBeenCalled();
  });

  it('attaches one snapshot to the cartridge from venue coordinates', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'OK', results }),
    });
    const cartridge = {
      dateISO: '2026-08-20',
      venueDetails: { coordinates: { latitude: 51.05, longitude: 16.19 } },
      photoPlan: {},
    };
    const result = await applySunsetSnapshot(cartridge, {
      timeZone,
      now,
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.photoPlan.sunset).toMatchObject({
      sunsetTime: '20:12',
      goldenHourStart: '19:32',
      status: 'LIVE',
    });
  });
});
