import { CANONICAL_STEPS } from '../../../src/lib/canonicalSteps.js';

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MANDATORY_KINDS = new Set(['FIRST_GUESTS_ARRIVAL', 'CLOSURE']);
const BOUNDARY_KIND = {
  FIRST_GUESTS_ARRIVAL: 'arrival',
  CLOSURE: 'closure',
};

export function serviceDayMinutes(clock) {
  if (!CLOCK.test(String(clock ?? ''))) return null;
  const [hours, minutes] = clock.split(':').map(Number);
  return (hours < 6 ? hours + 24 : hours) * 60 + minutes;
}

export function isValidClock(value) {
  return CLOCK.test(String(value ?? ''));
}

export function linkedDataForStep(step = {}) {
  return {
    dj: Boolean(step.dj),
    notes: Boolean(step.notes),
    subtasks: Array.isArray(step.subTasks) && step.subTasks.length > 0,
    game: Boolean(step.game),
    ceremony: Boolean(step.ceremony),
    mainSong: step.isMainSongRequired === true,
    anchor: Boolean(step.anchorId),
  };
}

function mandatoryKind(step) {
  const kind = step?.mandatory?.kind;
  return MANDATORY_KINDS.has(kind) ? kind : null;
}

function customId(title, seen) {
  const base = `custom_${String(title ?? 'step')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'step'}`;
  if (!seen.has(base)) {
    seen.add(base);
    return base;
  }
  let index = 2;
  while (seen.has(`${base}_${index}`)) index += 1;
  return `${base}_${index}`;
}

function classify(step, seenIds) {
  const kind = mandatoryKind(step);
  if (kind) {
    return {
      id: step.id,
      title: step.title,
      time: step.time,
      kind: 'mandatory',
      boundary: BOUNDARY_KIND[kind],
      locked: true,
      editable: { title: false, hour: false },
      removable: false,
      exampleValues: '',
      linked: linkedDataForStep(step),
      source: step,
    };
  }
  const canonical =
    CANONICAL_STEPS.find((entry) => entry.id === step.id) ??
    CANONICAL_STEPS.find((entry) => entry.name === step.title) ??
    null;
  const id = step.id || customId(step.title, seenIds);
  seenIds.add(id);
  if (canonical) {
    return {
      id,
      title: canonical.name,
      time: step.time,
      kind: 'canonical',
      locked: false,
      editable: { title: false, hour: true },
      removable: true,
      exampleValues: canonical.exampleValues,
      linked: linkedDataForStep({ ...step, isMainSongRequired: step.isMainSongRequired ?? canonical.isMainSongRequired, anchorId: step.anchorId ?? canonical.anchorId }),
      source: step,
    };
  }
  return {
    id,
    title: text(step.title),
    time: step.time,
    note: text(step.note),
    kind: 'custom',
    locked: false,
    editable: { title: true, hour: true, note: true },
    removable: true,
    exampleValues: '',
    linked: linkedDataForStep(step),
    location: step.location ?? 'Venue',
    source: step,
  };
}

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function sortRows(rows) {
  return [...rows].sort((left, right) => {
    const a = serviceDayMinutes(left.time) ?? Number.MAX_SAFE_INTEGER;
    const b = serviceDayMinutes(right.time) ?? Number.MAX_SAFE_INTEGER;
    return a - b;
  });
}

export function createTimelineDraft(steps = []) {
  const seenIds = new Set();
  const rows = sortRows((Array.isArray(steps) ? steps : []).filter(Boolean).map((step) => classify(step, seenIds)));
  const presentCanonical = new Set(rows.filter((row) => row.kind === 'canonical').map((row) => row.id));
  return {
    rows,
    excludedCanonical: CANONICAL_STEPS.filter((step) => !presentCanonical.has(step.id)).map((step) => step.id),
  };
}

export function updateTimelineRow(draft, id, patch = {}) {
  const rows = draft.rows.map((row) => {
    if (row.id !== id) return row;
    if (row.kind === 'mandatory') return row;
    if (row.kind === 'canonical') {
      return { ...row, time: patch.time ?? row.time };
    }
    return {
      ...row,
      ...(patch.title !== undefined ? { title: text(patch.title) } : {}),
      ...(patch.time !== undefined ? { time: patch.time } : {}),
      ...(patch.note !== undefined ? { note: text(patch.note) } : {}),
    };
  });
  return { ...draft, rows: sortRows(rows) };
}

export function excludeCanonicalStep(draft, id) {
  const row = draft.rows.find((entry) => entry.id === id && entry.kind === 'canonical');
  if (!row) return { draft, linked: null };
  return {
    draft: {
      ...draft,
      rows: draft.rows.filter((entry) => entry.id !== id),
      excludedCanonical: [...new Set([...draft.excludedCanonical, id])],
    },
    linked: row.linked,
  };
}

export function readdCanonicalStep(draft, id) {
  const catalog = CANONICAL_STEPS.find((step) => step.id === id);
  if (!catalog) return draft;
  if (draft.rows.some((row) => row.id === id)) return draft;
  const row = classify(
    {
      id: catalog.id,
      title: catalog.name,
      time: catalog.exampleHour,
      type: catalog.type,
      location: 'Venue',
      isMainSongRequired: catalog.isMainSongRequired,
      optionalFlag: catalog.optionalFlag,
      anchorId: catalog.anchorId,
    },
    new Set(draft.rows.map((entry) => entry.id)),
  );
  return {
    ...draft,
    rows: sortRows([...draft.rows, row]),
    excludedCanonical: draft.excludedCanonical.filter((entry) => entry !== id),
  };
}

export function addCustomStep(draft, { title, time, note } = {}) {
  const seen = new Set(draft.rows.map((row) => row.id));
  const cleanTitle = text(title) ?? '';
  const id = customId(cleanTitle, seen);
  const row = {
    id,
    title: cleanTitle,
    time,
    note: text(note),
    kind: 'custom',
    locked: false,
    editable: { title: true, hour: true, note: true },
    removable: true,
    exampleValues: '',
    linked: linkedDataForStep({}),
    location: 'Venue',
  };
  return { ...draft, rows: sortRows([...draft.rows, row]) };
}

export function deleteCustomStep(draft, id) {
  return {
    ...draft,
    rows: draft.rows.filter((row) => !(row.id === id && row.kind === 'custom')),
  };
}

export function validateTimelineDraft(draft) {
  const errors = [];
  const warnings = [];
  const arrival = draft.rows.find((row) => row.boundary === 'arrival');
  const closure = draft.rows.find((row) => row.boundary === 'closure');
  const arrivalMinutes = serviceDayMinutes(arrival?.time);
  const closureMinutes = serviceDayMinutes(closure?.time);
  const seenTimes = new Map();

  for (const row of draft.rows) {
    if (!isValidClock(row.time)) {
      errors.push({ id: row.id, code: 'invalid_hour', message: `Invalid hour for ${row.title || row.id}` });
    } else {
      const minutes = serviceDayMinutes(row.time);
      seenTimes.set(row.time, [...(seenTimes.get(row.time) ?? []), row.id]);
      if (
        row.kind !== 'mandatory' &&
        arrivalMinutes !== null &&
        minutes < arrivalMinutes
      ) {
        warnings.push({ id: row.id, code: 'before_arrival', message: `${row.title} is before first guests arrival` });
      }
      if (
        row.kind !== 'mandatory' &&
        closureMinutes !== null &&
        minutes > closureMinutes
      ) {
        warnings.push({ id: row.id, code: 'after_closure', message: `${row.title} is after wedding closure` });
      }
    }
    if (row.kind === 'custom' && !row.title) {
      errors.push({ id: row.id, code: 'empty_title', message: 'Custom step title is required' });
    }
  }

  for (const [time, ids] of seenTimes) {
    if (ids.length > 1) {
      warnings.push({ id: ids[0], code: 'duplicate_time', message: `Duplicate time ${time}` });
    }
  }

  return { errors, warnings };
}

export function buildTimelineDocRows(draft) {
  return sortRows(draft.rows)
    .filter((row) => row.kind !== 'mandatory')
    .map((row) => ({
      Hour: row.time,
      'Step name': row.title,
      'Example values': row.exampleValues ?? '',
    }));
}
