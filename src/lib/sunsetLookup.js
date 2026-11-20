// Sunset snapshot lookup (issue #695). The app calls sunrise-sunset.org once at
// publish/import time and stores the result in the cartridge; devices render the
// snapshot and never estimate sunset data offline.

export const SUNSET_PROVIDER = 'sunrise-sunset.org';
export const SUNSET_ENDPOINT = 'https://api.sunrise-sunset.org/json';
export const GOLDEN_HOUR_MINUTES_BEFORE_SUNSET = 40;

function localClock(iso, timeZone) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  });
  const parts = formatter.formatToParts(date);
  const hour = parts.find((part) => part.type === 'hour')?.value;
  const minute = parts.find((part) => part.type === 'minute')?.value;
  if (!hour || !minute) return null;
  return `${hour === '24' ? '00' : hour}:${minute}`;
}

export function sunsetLookupUrl({ latitude, longitude, dateISO }) {
  const url = new URL(SUNSET_ENDPOINT);
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lng', String(longitude));
  url.searchParams.set('date', dateISO);
  url.searchParams.set('formatted', '0');
  return url.toString();
}

export function buildSunsetSnapshot({
  results,
  latitude,
  longitude,
  now = new Date(),
  timeZone = 'UTC',
}) {
  const sunsetTime = localClock(results?.sunset, timeZone);
  const civilTwilightEnd = localClock(results?.civil_twilight_end, timeZone);
  if (!sunsetTime || !civilTwilightEnd) {
    return { provider: SUNSET_PROVIDER, status: 'UNAVAILABLE' };
  }
  const goldenStart = new Date(
    new Date(results.sunset).getTime() - GOLDEN_HOUR_MINUTES_BEFORE_SUNSET * 60 * 1000,
  ).toISOString();
  return {
    provider: SUNSET_PROVIDER,
    latitude,
    longitude,
    lastFetchedAt: (now instanceof Date ? now : new Date(now)).toISOString(),
    sunsetTime,
    goldenHourStart: localClock(goldenStart, timeZone),
    civilTwilightEnd,
    status: 'LIVE',
  };
}

export async function fetchSunsetSnapshot({
  latitude,
  longitude,
  dateISO,
  timeZone = 'UTC',
  now = new Date(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !dateISO) {
    return { provider: SUNSET_PROVIDER, status: 'UNAVAILABLE' };
  }
  if (typeof fetchImpl !== 'function') {
    return { provider: SUNSET_PROVIDER, status: 'UNAVAILABLE' };
  }
  try {
    const response = await fetchImpl(sunsetLookupUrl({ latitude, longitude, dateISO }));
    if (!response?.ok) return { provider: SUNSET_PROVIDER, status: 'UNAVAILABLE' };
    const payload = await response.json();
    if (payload?.status !== 'OK' || !payload?.results) {
      return { provider: SUNSET_PROVIDER, status: 'UNAVAILABLE' };
    }
    return buildSunsetSnapshot({ results: payload.results, latitude, longitude, now, timeZone });
  } catch {
    return { provider: SUNSET_PROVIDER, status: 'UNAVAILABLE' };
  }
}

export async function applySunsetSnapshot(cartridge, options = {}) {
  const coordinates =
    cartridge?.venueDetails?.coordinates ?? cartridge?.photoPlan?.sunset ?? null;
  const latitude = coordinates?.latitude == null ? Number.NaN : Number(coordinates.latitude);
  const longitude = coordinates?.longitude == null ? Number.NaN : Number(coordinates.longitude);
  const snapshot = await fetchSunsetSnapshot({
    latitude,
    longitude,
    dateISO: options.dateISO ?? cartridge?.dateISO ?? null,
    timeZone: options.timeZone ?? 'UTC',
    now: options.now ?? new Date(),
    fetchImpl: options.fetchImpl,
  });
  return {
    ...cartridge,
    photoPlan: {
      ...(cartridge?.photoPlan ?? {}),
      sunset: snapshot,
    },
  };
}
