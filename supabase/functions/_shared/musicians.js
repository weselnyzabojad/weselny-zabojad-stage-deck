// Pure helpers for the admin-managed musician registry (issue #990).
//
// Musicians are independent from the VIP DJ registry: they have no identity,
// contact or logo fields and never modify the Google Doc. The Doc only supplies
// `musicians.expected`; the registry is snapshotted into the cartridge at
// publish time.

export const MUSICIAN_CLOCK_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function text(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export function normalizeMusicianPayload(body = {}) {
  const name = text(body.name, 120);
  if (!name) return { error: 'Musician name is required.' };

  const instrument = text(body.instrument, 120);
  if (!instrument) return { error: 'Instrument is required.' };

  const startTime = text(body.startTime, 5);
  const endTime = text(body.endTime, 5);
  if (Boolean(startTime) !== Boolean(endTime)) {
    return { error: 'Provide both start and end time, or neither.' };
  }
  if (startTime && !MUSICIAN_CLOCK_PATTERN.test(startTime)) {
    return { error: 'Start time must be HH:MM.' };
  }
  if (endTime && !MUSICIAN_CLOCK_PATTERN.test(endTime)) {
    return { error: 'End time must be HH:MM.' };
  }
  // Equal clocks are ambiguous; end earlier than start is a valid cross-midnight
  // window, matching the media-team planning contract.
  if (startTime && endTime && startTime === endTime) {
    return { error: 'Start and end time must differ.' };
  }

  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  if (notes.length > 500) return { error: 'Notes must be 500 characters or fewer.' };

  return {
    musician: {
      name,
      instrument,
      start_time: startTime || null,
      end_time: endTime || null,
      ceremony_required: body.ceremonyRequired === true,
      notes: notes || null,
      active: body.active !== false,
    },
  };
}

export function musicianRowToCartridge(row = {}) {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    instrument: String(row.instrument ?? ''),
    ...(row.start_time ? { startTime: row.start_time } : {}),
    ...(row.end_time ? { endTime: row.end_time } : {}),
    ceremonyRequired: row.ceremony_required === true,
    ...(row.notes ? { notes: row.notes } : {}),
    active: row.active !== false,
  };
}

export function activeMusiciansForSnapshot(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row && row.active !== false)
    .map(musicianRowToCartridge)
    .filter((musician) => musician.id && musician.name && musician.instrument);
}

export function withMusicianSnapshot(cartridge = {}, rows = []) {
  const expected = cartridge?.musicians?.expected === true;
  return {
    ...cartridge,
    musicians: {
      expected,
      items: activeMusiciansForSnapshot(rows),
    },
  };
}
