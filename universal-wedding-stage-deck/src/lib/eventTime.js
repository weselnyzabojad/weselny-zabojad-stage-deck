// Event date/time helpers for the real-time reel clock (project.md P0.6) and
// the ISO timestamp migration (TODO 23).
//
// Actual step starts are stored as full ISO datetimes internally; display
// strings stay `HH:MM` in the venue timezone. Legacy v1.1 cartridges that store
// bare `HH:MM` are migrated on load by `normalizeActualTimestamp`.
//
// Everything here is pure and uses the built-in Intl API, so it works offline
// and with any IANA timezone.

export const SERVICE_DAY_ROLLOVER_HOUR = 6;

const DATE_ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const ISO_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

const formatterCache = new Map();

export function isIsoTimestamp(value) {
  return typeof value === 'string' && ISO_PATTERN.test(value) && Number.isFinite(Date.parse(value));
}

export function isValidTimeZone(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  try {
    // Throws a RangeError for an unknown IANA zone.
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

// v1.2 keeps the venue timezone in `venueLogistics.timezone`; v1.1 cartridges
// have none, so fall back to the device timezone.
export function resolveVenueTimeZone(wedding) {
  const candidate = wedding?.venueLogistics?.timezone ?? wedding?.timezone;
  return isValidTimeZone(candidate) ? candidate : deviceTimeZone();
}

// `dateISO` is canonical in v1.2. v1.1 cartridges derive it from the
// `weddingId` prefix or the display `date` (DD.MM.YYYY).
export function resolveEventDateISO(wedding) {
  if (DATE_ISO_PATTERN.test(wedding?.dateISO ?? '')) return wedding.dateISO;

  const fromId = /^(\d{4}-\d{2}-\d{2})/.exec(wedding?.weddingId ?? '');
  if (fromId) return fromId[1];

  const match = /^([0-3]\d)\.([01]\d)\.(\d{4})$/.exec(wedding?.date ?? '');
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;

  return null;
}

export function addDaysISO(dateISO, days) {
  const match = DATE_ISO_PATTERN.exec(dateISO ?? '');
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatterFor(timeZone) {
  const key = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  if (!formatterCache.has(key)) {
    formatterCache.set(
      key,
      new Intl.DateTimeFormat('en-US', {
        timeZone: key,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    );
  }
  return formatterCache.get(key);
}

// Offset of `timeZone` from UTC at the given instant, in minutes
// (e.g. Europe/Warsaw in summer -> 120).
export function timeZoneOffsetMinutes(timeZone, date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return 0;

  const parts = formatterFor(timeZone).formatToParts(date);
  const values = {};
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }

  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return (asUtc - date.getTime()) / 60000;
}

// Interpret a wall-clock `HH:MM[:SS]` on `dateISO` in `timeZone` as an instant.
export function zonedDateTimeToDate(dateISO, clock, timeZone) {
  const day = DATE_ISO_PATTERN.exec(dateISO ?? '');
  const time = CLOCK_PATTERN.exec(clock ?? '');
  if (!day || !time) return null;

  const [year, month, date] = [Number(day[1]), Number(day[2]), Number(day[3])];
  const [hour, minute, second = 0] = [Number(time[1]), Number(time[2]), Number(time[3] ?? 0)];
  if (hour > 23 || minute > 59 || second > 59) return null;

  let utc = Date.UTC(year, month - 1, date, hour, minute, second);

  // Two passes so a DST transition between the guess and the result resolves.
  const firstOffset = timeZoneOffsetMinutes(timeZone, new Date(utc));
  utc -= firstOffset * 60000;
  const secondOffset = timeZoneOffsetMinutes(timeZone, new Date(utc));
  if (secondOffset !== firstOffset) utc -= (secondOffset - firstOffset) * 60000;

  return new Date(utc);
}

// Resolve an event clock to an instant. A clock before 06:00 belongs to the
// next calendar day (after-midnight steps such as Oczepiny at 00:00). When
// `after` is given, roll forward a day if the candidate is clearly earlier.
export function clockToEventDate({ clock, eventDateISO, timeZone, after = null }) {
  if (!eventDateISO) return null;

  const minutes = /^(\d{1,2}):(\d{2})/.exec(clock ?? '');
  const earlyMorning = minutes ? Number(minutes[1]) * 60 + Number(minutes[2]) < SERVICE_DAY_ROLLOVER_HOUR * 60 : false;
  let dayOffset = earlyMorning ? 1 : 0;

  let date = zonedDateTimeToDate(addDaysISO(eventDateISO, dayOffset), clock, timeZone);
  if (!date) return null;

  if (after instanceof Date && Number.isFinite(after.getTime())) {
    // More than 12 hours behind the reference means it belongs to the next day.
    if (date.getTime() < after.getTime() - 12 * 3600 * 1000) {
      dayOffset += 1;
      date = zonedDateTimeToDate(addDaysISO(eventDateISO, dayOffset), clock, timeZone);
    }
  }

  return date;
}

// Legacy HH:MM -> ISO; ISO passes through. If the event date/timezone is
// unknown the raw value is kept so no data is lost.
export function normalizeActualTimestamp(value, { eventDateISO, timeZone } = {}) {
  if (typeof value !== 'string' || value.length === 0) return null;

  if (isIsoTimestamp(value)) return new Date(Date.parse(value)).toISOString();

  if (CLOCK_PATTERN.test(value) && eventDateISO) {
    const date = clockToEventDate({ clock: value, eventDateISO, timeZone });
    if (date) return date.toISOString();
  }

  return value;
}

// Display clock (HH:MM) in the venue timezone. Accepts a Date, an ISO string,
// or a legacy HH:MM string.
export function formatClockInZone(value, timeZone) {
  if (typeof value === 'string' && CLOCK_PATTERN.test(value) && !isIsoTimestamp(value)) {
    return value.slice(0, 5);
  }

  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: isValidTimeZone(timeZone) ? timeZone : 'UTC',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTimeOfDay(value, timeZone, { seconds = false } = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: isValidTimeZone(timeZone) ? timeZone : 'UTC',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
  }).format(date);
}

// M:SS (or H:MM:SS when the value is at least an hour). Always reports the
// magnitude; callers pair it with a "remaining" or "overrun" label.
export function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) return '—';
  const total = Math.max(0, Math.round(Math.abs(totalSeconds)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatCountdown(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) return '—';
  return totalSeconds < 0 ? `OVER ${formatDuration(totalSeconds)}` : formatDuration(totalSeconds);
}
