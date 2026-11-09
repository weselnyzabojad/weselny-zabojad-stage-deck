import { clockToEventDate } from './eventTime.js';

export const ATTRACTION_ANNOUNCE_LEAD_MINUTES = 15;

function minutesUntil(from, to) {
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 60000));
}

// Derives the MC reminder state from the shared event clock. Returns SCHEDULED
// (no countdown) when the event date/clock is unavailable instead of guessing.
export function resolveAttractionReminder(attraction, now, { eventDateISO = null, timeZone = 'UTC' } = {}) {
  const start = clockToEventDate({
    clock: attraction?.startTime,
    eventDateISO,
    timeZone,
  });
  const end = clockToEventDate({
    clock: attraction?.endTime,
    eventDateISO,
    timeZone,
    after: start ?? undefined,
  });
  const nowDate = now instanceof Date && Number.isFinite(now.getTime()) ? now : null;

  if (!start || !end || !nowDate) {
    return { state: 'SCHEDULED', startAt: start, endAt: end, minutes: null };
  }

  const announceAt = new Date(start.getTime() - ATTRACTION_ANNOUNCE_LEAD_MINUTES * 60000);
  if (nowDate < announceAt) {
    return {
      state: 'UPCOMING',
      startAt: start,
      endAt: end,
      minutes: minutesUntil(nowDate, start),
    };
  }
  if (nowDate < start) {
    return {
      state: 'ANNOUNCE',
      startAt: start,
      endAt: end,
      minutes: minutesUntil(nowDate, start),
    };
  }
  if (nowDate < end) {
    return {
      state: 'AVAILABLE',
      startAt: start,
      endAt: end,
      minutes: minutesUntil(nowDate, end),
    };
  }
  return { state: 'ENDED', startAt: start, endAt: end, minutes: 0 };
}

export function resolveBookedAttractions(attractions, options = {}) {
  return (Array.isArray(attractions) ? attractions : [])
    .filter((attraction) => attraction?.booked === true)
    .map((attraction) => ({
      ...attraction,
      reminder: resolveAttractionReminder(attraction, options.now, options),
    }))
    .filter((attraction) => attraction.reminder.state !== 'ENDED');
}
