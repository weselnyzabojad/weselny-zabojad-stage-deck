import { clockToMinutes } from './clockMath.js';
import { SERVICE_DAY_ROLLOVER_HOUR } from './eventTime.js';

// Read-only end-hour awareness for the Standard DJ (issue #991). This is a
// presentation helper only: it never changes timeline durations or anchors.
const MEDIA_ROLE_LABELS = {
  PHOTO: 'Photographer',
  PHOTOGRAPHER: 'Photographer',
  PHOTO2: 'Photographer 2',
  VIDEO: 'Cameraman',
  VIDEOGRAPHER: 'Cameraman',
  DRONE: 'Drone',
};

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function endHourSortValue(startTime, endTime) {
  const end = clockToMinutes(endTime);
  if (end == null) return null;
  const start = clockToMinutes(startTime);
  // An end earlier than its start is the next calendar day.
  return start != null && end < start ? end + 24 * 60 : end;
}

function formatWindow(startTime, endTime) {
  if (startTime && endTime) return `${startTime}–${endTime}`;
  return endTime;
}

export function buildEndHours(wedding = {}) {
  const rows = [];
  const musicians = Array.isArray(wedding?.musicians?.items) ? wedding.musicians.items : [];
  for (const musician of musicians) {
    if (!musician || musician.active === false) continue;
    const endTime = text(musician.endTime);
    if (!endTime) continue;
    rows.push({
      id: `musician-${musician.id ?? musician.name}`,
      kind: 'musician',
      role: 'Musician',
      name: text(musician.name) || 'Musician',
      instrument: text(musician.instrument),
      startTime: text(musician.startTime),
      endTime,
    });
  }

  const mediaTeam = Array.isArray(wedding?.mediaTeam) ? wedding.mediaTeam : [];
  for (const member of mediaTeam) {
    if (!member || typeof member !== 'object') continue;
    const endTime = text(member.endTime);
    if (!endTime) continue;
    const role = text(member.role).toUpperCase();
    rows.push({
      id: `media-${member.id ?? member.name ?? role}`,
      kind: 'media',
      role: MEDIA_ROLE_LABELS[role] ?? (role ? role.toLowerCase() : 'Media'),
      name: text(member.name) || MEDIA_ROLE_LABELS[role] || 'Media team',
      instrument: '',
      startTime: text(member.startTime),
      endTime,
    });
  }

  return rows
    .map((row) => ({ ...row, sortValue: endHourSortValue(row.startTime, row.endTime) }))
    .filter((row) => row.sortValue != null)
    .sort((a, b) => a.sortValue - b.sortValue || a.name.localeCompare(b.name));
}

export function formatEndHour(row) {
  return formatWindow(row.startTime, row.endTime);
}

// Presence rows for the DJ notebook: both start and end are required, and a
// row disappears as soon as the live event clock passes its end. The service
// day rolls over in the early morning so a 00:30 end still belongs to the
// previous evening rather than becoming "upcoming" after a normal 21:30 end.
export function buildVendorPresence(wedding = {}, nowClock = null) {
  const now = clockToMinutes(nowClock);
  if (now == null) return [];

  const serviceNow = now < SERVICE_DAY_ROLLOVER_HOUR * 60 ? now + 24 * 60 : now;

  return buildEndHours(wedding)
    .filter((row) => row.startTime && row.endTime)
    .filter((row) => row.sortValue >= serviceNow)
    .map((row) => {
      const start = clockToMinutes(row.startTime);
      return {
        ...row,
        state: start != null && serviceNow >= start ? 'active' : 'upcoming',
      };
    });
}

// Compact active-vendor badges for the DJ VIP and Musician current-card footers.
// Only vendors inside a complete start/end window appear; upcoming and
// end-only rows are deliberately excluded.
export function buildActiveVendors(wedding = {}, nowClock = null) {
  const now = clockToMinutes(nowClock);
  if (now == null) return [];

  const serviceNow = now < SERVICE_DAY_ROLLOVER_HOUR * 60 ? now + 24 * 60 : now;

  return buildEndHours(wedding)
    .filter((row) => row.startTime && row.endTime && row.sortValue != null)
    .map((row) => {
      const rawStart = clockToMinutes(row.startTime);
      const start =
        rawStart != null && rawStart < SERVICE_DAY_ROLLOVER_HOUR * 60
          ? rawStart + 24 * 60
          : rawStart;
      const end =
        start != null && row.sortValue < start
          ? row.sortValue + 24 * 60
          : row.sortValue;
      if (start == null || serviceNow < start || serviceNow > end) {
        return null;
      }
      return {
        ...row,
        remainingMinutes: Math.max(0, end - serviceNow),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.sortValue - b.sortValue || a.name.localeCompare(b.name));
}
