import { clockToMinutes } from './clockMath.js';

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

// VIP lane position by end clock; presentation only, never timeline data.
export function lanePositionPercent(sortValue) {
  if (!Number.isFinite(sortValue)) return 0;
  const minuteOfDay = ((sortValue % 1440) + 1440) % 1440;
  return Math.min(100, Math.max(0, (minuteOfDay / 1440) * 100));
}
