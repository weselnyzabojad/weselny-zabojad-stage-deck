import { calculateStepDurations } from './stepDurations.js';
import { deriveHardAnchors } from './hardAnchors.js';
import { applyMandatorySettings } from './mandatorySteps.js';
import { normalizeSpeechMode } from './speeches.js';
import { canonicalStepByName } from './canonicalSteps.js';
import { normalizePrivacy } from '../config/index.js';
import { resolveEventDateISO } from './eventTime.js';

// Matches the first HH:MM clock at the start of a loose time string. Accepts
// `22.15`, `15h00`, ranges (`15:40/16:00`, `22:00-22:30`, `18:00–20:00`) and
// single-digit hours; the importer normalizes them to a strict `HH:MM`.
const CLOCK_TOKEN = /^([01]?\d|2[0-3])[:.hH]([0-5]\d)/;
// UM contract from `## EVENT` → `Wedding ID`; the old YYYY-MM-DD_slug format
// is rejected here so a bad Doc cannot reach admin publication.
const WEDDING_ID = /^[A-Za-z0-9&]+-UM-\d{4}-\d{2}-\d{3}$/;

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function bool(value, fallback = null) {
  const clean = text(value)?.toLowerCase();
  if (['true', 'yes', 'y', '1', 'on'].includes(clean)) return true;
  if (['false', 'no', 'n', '0', 'off'].includes(clean)) return false;
  return fallback;
}

function int(value, fallback = null) {
  const number = Number.parseInt(String(value ?? '').replace(/[^\d-]/g, ''), 10);
  return Number.isInteger(number) ? number : fallback;
}

// Optional guest counts (issue #1250). Only non-negative whole numbers are
// accepted; invalid input is warned about and left absent so the importer never
// invents a zero.
function guestCount(source, label, warnings) {
  const raw = text(kv(source, label));
  if (raw == null) return undefined;
  if (!/^\d+$/.test(raw)) {
    warnings.push(`DEMOGRAPHICS: "${label}" must be a non-negative whole number; ignored`);
    return undefined;
  }
  return Number.parseInt(raw, 10);
}

function mapDemographics(source, warnings) {
  const values = {
    total: guestCount(source, 'Guests total', warnings),
    pl: guestCount(source, 'Guests PL', warnings),
    fr: guestCount(source, 'Guests FR', warnings),
    other: guestCount(source, 'Guests other', warnings),
    notes: text(kv(source, 'Notes')) ?? undefined,
  };
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  );
}

// Normalizes a loose time string to a strict `HH:MM` clock, or returns null.
// For a range it takes the first clock (the planned start); the importer never
// invents a time when none parses.
export function normalizeClock(value) {
  const clean = text(value);
  if (!clean) return null;
  const match = CLOCK_TOKEN.exec(clean);
  if (!match) return null;
  return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
}

function clock(value) {
  return normalizeClock(value);
}

// Formats a whole number of seconds as a `MM:SS` timestamp (first-dance fields).
function toMmss(totalSeconds) {
  const seconds = Number.isInteger(totalSeconds) && totalSeconds >= 0 ? totalSeconds : 0;
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function list(value) {
  return String(value ?? '')
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function languageCodes(value) {
  return [...new Set(list(value).map((code) => code.toUpperCase()))];
}

function slug(value, fallback = 'item') {
  return (
    text(value)
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || fallback
  );
}

const SERVICE_PACKAGES = new Set(['HOST_ONLY', 'DJ_MC', 'HOST_AND_DJ_VIP']);

function normalizeServicePackage(value) {
  const clean = text(value)?.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (clean === 'DJMC') return 'DJ_MC';
  return SERVICE_PACKAGES.has(clean) ? clean : null;
}

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined).filter((item) => item !== undefined);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined && item !== null)
        .map(([key, item]) => [key, stripUndefined(item)]),
    );
  }
  return value;
}

function normalizeKey(key) {
  return String(key ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function section(parsed, marker) {
  return parsed?.byMarker?.[marker] ?? null;
}

function kv(source, label) {
  if (!source?.keyValues) return null;
  const target = normalizeKey(label);
  const found = Object.entries(source.keyValues).find(([key]) => normalizeKey(key) === target);
  return found ? found[1] : null;
}

function table(source, expectedHeader) {
  if (!Array.isArray(source?.tables)) return [];
  const target = expectedHeader.map(normalizeKey);
  const match = source.tables.find(
    (entry) =>
      Array.isArray(entry.header) &&
      entry.header.length === target.length &&
      entry.header.every((cell, index) => normalizeKey(cell) === target[index]),
  );
  return match?.rows ?? [];
}

function subsection(source, title) {
  const target = normalizeKey(title);
  return (
    source?.subSections?.find((entry) => normalizeKey(entry.title) === target) ?? null
  );
}

function subTable(source, title, expectedHeader) {
  return table(subsection(source, title), expectedHeader);
}

// Issue #1213: Sto Lat only accepts YES / ON_REQUEST / NO. Legacy Doc values
// are normalized before validation; anything unrecognised fails safely to NO.
// A "Sto Lat wedding" for the season KPI is YES or ON_REQUEST.
function normalizeStoLatStatus(value, warnings) {
  const raw = text(value);
  const clean = raw ? raw.toUpperCase().replace(/[\s-]+/g, '_') : '';
  if (clean === 'YES') return 'YES';
  if (clean === 'ON_REQUEST') return 'ON_REQUEST';
  if (clean === 'NO' || clean === 'STRICT_NO' || clean === 'OFF') return 'NO';
  warnings.push(
    `CULTURAL RULES: Sto Lat status "${raw ?? ''}" is not recognised; mapped to NO.`,
  );
  return 'NO';
}

function mapCulturalRules(rows, warnings = []) {
  const keyMap = { stolat: 'sto_lat', gorzko: 'gorzko', breadsalt: 'bread_salt' };
  const rules = {};
  for (const row of rows) {
    const key = keyMap[normalizeKey(row.Rule)];
    if (!key) continue;
    rules[key] = {};
    // Gorzko and Bread & Salt keep their existing contract. Sto Lat is
    // normalized to the three product values before schema validation.
    if (key === 'sto_lat') {
      rules[key].status = normalizeStoLatStatus(row.Status, warnings);
    } else if (text(row.Status)) {
      rules[key].status = text(row.Status);
    }
    if (key === 'bread_salt' && text(row.Note)) rules[key].note = text(row.Note);
  }
  return rules;
}

function mapCeremony(event) {
  const type = text(kv(event, 'Ceremony type'))?.toUpperCase() ?? null;
  return {
    type: ['RELIGIOUS', 'CIVIL', 'HUMANIST'].includes(type) ? type : null,
    mcSupportRequested: bool(kv(event, 'Ceremony MC support'), false),
    location: text(kv(event, 'Ceremony location')),
    notes: text(kv(event, 'Ceremony notes')),
  };
}

// Maps the verbatim trilingual ceremony script onto the Ceremony step's
// teleprompter. Each `### <heading>` is one speech item; its fenced blocks are
// the per-language lines (fence language is the ISO code). Copied verbatim,
// never summarized or translated.
function mapCeremonyScript(source, steps) {
  const stepId = text(kv(source, 'Step ID'));
  const step = steps.find((entry) => entry.id === stepId);
  if (!step) return;
  const items = (source?.subSections ?? [])
    .map((sub) => {
      const lines = (sub.codeBlocks ?? [])
        .filter((block) => ['PL', 'FR', 'EN'].includes(block.lang?.toUpperCase()))
        .map((block) => ({ lang: block.lang.toUpperCase(), text: block.text.trim() }));
      if (lines.length === 0) return null;
      return { id: slug(sub.title), heading: sub.title.trim(), lines };
    })
    .filter(Boolean);
  if (items.length === 0) return;
  step.teleprompter = {
    has_script: true,
    type: 'SPEECH',
    title: 'Ceremony script',
    items,
  };
}

// Informational ceremony moments. They are attached to the Ceremony step and
// never become timeline steps or duration inputs.
const CEREMONY_SUBSTEP_ROLES = {
  mc: 'MC',
  dj: 'DJ',
  musician: 'Musician',
  speaker: 'Speaker',
  venue: 'Venue',
};

function mapCeremonySubSteps(source, steps, warnings = []) {
  const rows = table(source, [
    'Step ID',
    'Sub-step ID',
    'Time',
    'Title',
    'Notes',
    'Music cue',
    'Responsible role',
  ]);
  const byStep = new Map();
  for (const row of rows) {
    const stepId = text(row['Step ID']);
    const id = text(row['Sub-step ID']);
    const title = text(row.Title);
    const step = steps.find((entry) => entry.id === stepId);
    if (!step?.ceremony) {
      warnings.push(`CEREMONY SUBSTEPS: unknown Ceremony step "${stepId || '?'}"`);
      continue;
    }
    if (!id || !title) {
      warnings.push(
        `CEREMONY SUBSTEPS: row for "${stepId || '?'}" needs both Sub-step ID and Title`,
      );
      continue;
    }
    const list = byStep.get(stepId) ?? [];
    if (list.some((entry) => entry.id === id)) {
      warnings.push(`CEREMONY SUBSTEPS: duplicate sub-step id "${id}" on "${stepId}"`);
      continue;
    }
    const time = text(row.Time);
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      warnings.push(`CEREMONY SUBSTEPS: invalid time "${time}" on "${id}"`);
      continue;
    }
    const roleRaw = normalizeKey(row['Responsible role']);
    const responsibleRole = roleRaw ? CEREMONY_SUBSTEP_ROLES[roleRaw] : null;
    if (roleRaw && !responsibleRole) {
      warnings.push(
        `CEREMONY SUBSTEPS: invalid responsible role "${text(row['Responsible role'])}" on "${id}"`,
      );
    }
    const entry = {
      id,
      title,
      ...(time ? { time } : {}),
      ...(text(row.Notes) ? { notes: text(row.Notes) } : {}),
      ...(text(row['Music cue']) ? { musicCue: text(row['Music cue']) } : {}),
      ...(responsibleRole ? { responsibleRole } : {}),
    };
    list.push(entry);
    byStep.set(stepId, list);
  }
  for (const [stepId, subSteps] of byStep) {
    const step = steps.find((entry) => entry.id === stepId);
    if (step?.ceremony) step.ceremony = { ...step.ceremony, subSteps };
  }
}


function mapOczepiny(source, warnings = []) {
  const throwings = {};
  const missing = [];
  const rawThrowings = text(kv(source, 'Throwings')) ?? '';
  const throwingKeys = { veil: 'veil', bouquet: 'bouquet', bowtie: 'bowTie', cravat: 'cravat' };
  const throwingLabels = { veil: 'veil', bouquet: 'bouquet', bowTie: 'bow-tie', cravat: 'cravat' };
  for (const part of rawThrowings.split(',')) {
    const [rawKey, value] = part.split('=').map((item) => item.trim());
    const key = throwingKeys[normalizeKey(rawKey)];
    if (!key) continue;
    throwings[key] = bool(value, false);
  }
  for (const [key, label] of Object.entries(throwingLabels)) {
    if (!(key in throwings)) missing.push(`${label} throwing`);
  }

  const enabled = bool(kv(source, 'Enabled'));
  const order = text(kv(source, 'Order')) ?? text(kv(source, 'Oczepiny variant'));
  const variant = text(kv(source, 'Oczepiny variant')) ?? text(kv(source, 'Order'));
  const toss = text(kv(source, 'Toss'));
  const ties = text(kv(source, 'Ties'));
  const gameEnabled = bool(kv(source, 'Game enabled'));
  const countdownMode = text(kv(source, 'Countdown mode'));
  const winnerEnabled = bool(kv(source, 'Winner photo enabled'));
  const winnersOnly = bool(kv(source, 'Winners only photo'));
  const winnersWithCouple = bool(kv(source, 'Winners + couple photo'));
  const musicEnabled = bool(kv(source, 'Music enabled'));

  for (const [value, label] of [
    [enabled, 'Enabled'],
    [order, 'Order'],
    [variant, 'Oczepiny variant'],
    [toss, 'Toss'],
    [ties, 'Ties'],
    [gameEnabled, 'Game enabled'],
    [countdownMode, 'Countdown mode'],
    [winnerEnabled, 'Winner photo enabled'],
    [winnersOnly, 'Winners only photo'],
    [winnersWithCouple, 'Winners + couple photo'],
    [musicEnabled, 'Music enabled'],
  ]) {
    if (value === null || value === undefined) missing.push(label);
  }
  if (missing.length) warnings.push(`OCZEPINY: missing ${missing.join(', ')}`);

  // The allowed list is fixed; the throwing/winner flags describe the plan but
  // the couple no longer authors the sub-event table.
  const subEvents = [
    { id: 'veil_toss', title: 'Veil toss' },
    { id: 'bouquet_toss', title: 'Bouquet toss' },
    { id: 'bow_tie_game', title: 'Bow-tie game' },
    { id: 'cravat_toss', title: 'Cravat toss' },
    { id: 'winner_photo', title: 'Winner photo' },
    { id: 'winners_with_couple_photo', title: 'Winners with couple photo' },
  ];

  return {
    enabled: enabled ?? true,
    order,
    variant,
    toss,
    ties,
    throwings: Object.keys(throwings).length ? throwings : undefined,
    game: {
      enabled: gameEnabled ?? false,
    },
    countdown: { mode: countdownMode ?? 'MC' },
    winnerPhoto: {
      enabled: winnerEnabled ?? false,
      // The photographer cue is app/admin data, never a Doc value.
      photographerCue: '',
      winnersOnly: winnersOnly ?? false,
      winnersWithCouple: winnersWithCouple ?? false,
      // Derived from the assigned media team after the cartridge is assembled.
      photographerAvailable: false,
    },
    music: {
      enabled: musicEnabled ?? false,
      // Track/playlist are optional in the Doc but required by the schema.
      track: text(kv(source, 'Music track')) ?? '',
      playlist: list(kv(source, 'Music playlist')),
    },
    subEvents,
  };
}

function parseTimelineNotes(step, notes, warnings) {
  const clean = text(notes) ?? '';
  const lower = clean.toLowerCase();
  if (/guest order:\s*guests first/.test(lower)) step.grandEntranceOrder = 'GUESTS_FIRST';
  if (/guest order:\s*newlyweds first/.test(lower)) step.grandEntranceOrder = 'NEWLYWEDS_FIRST';

  const mode = /mode\s+(fake|normal)/i.exec(clean);
  if (mode) step.firstDanceMode = mode[1].toUpperCase();
  const start = /start at\s+(\d+)\s*s/i.exec(clean);
  if (start) step.firstDanceStartAt = toMmss(Number(start[1]));
  const stop = /stop after\s+(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/i.exec(clean);
  if (stop && (stop[1] || stop[2])) {
    step.firstDanceStopAt = toMmss(Number(stop[1] ?? 0) * 60 + Number(stop[2] ?? 0));
  }
  if (!step.firstDanceMode && /first dance/i.test(step.title) && !step.firstDanceNotes) {
    warnings.push(`step ${step.id}: First Dance notes did not declare a mode`);
  }
}

function mapStepNotes(source, steps, warnings = []) {
  const rowsByName = table(source, ['Step name', 'Notes']);
  const rows = rowsByName.length ? rowsByName : table(source, ['Step ID', 'Notes']);
  for (const row of rows) {
    const step = resolveSatelliteStep(steps, row, 'NOTES', warnings);
    if (!step) continue;
    const note = text(row.Notes);
    if (note) {
      step.notes = note;
      parseTimelineNotes(step, note, warnings);
    }
  }
}

function mapTimeline(source, warnings, errors = []) {
  const tables = Array.isArray(source?.tables) ? source.tables : [];
  const candidate = tables.find((entry) =>
    (entry.header ?? []).some((cell) =>
      ['hour', 'stepname', 'examplevalues'].includes(normalizeKey(cell)),
    ),
  );
  if (candidate) {
    const expected = ['Hour', 'Step name', 'Example values'].map(normalizeKey);
    const actual = (candidate.header ?? []).map(normalizeKey);
    if (actual.length !== expected.length || actual.some((cell, index) => cell !== expected[index])) {
      errors.push(
        `TIMELINE: expected exactly Hour | Step name | Example values (found ${candidate.header.join(' | ')})`,
      );
      return { steps: [], anchorIds: {} };
    }
    return mapCanonicalTimeline(candidate.rows ?? [], errors);
  }
  return mapLegacyTimeline(source, warnings, errors);
}

function mapCanonicalTimeline(rows, errors) {
  const steps = [];
  const anchorIds = {};
  const seen = new Set();
  rows.forEach((row, index) => {
    const label = `TIMELINE row ${index + 1}`;
    const rawHour = text(row.Hour);
    const name = text(row['Step name']);
    if (!name) {
      errors.push(`${label}: missing Step name`);
      return;
    }
    const canonical = canonicalStepByName(name);
    if (!canonical) {
      errors.push(`${label}: unknown Step name "${name}"`);
      return;
    }
    if (seen.has(canonical.id)) {
      errors.push(`${label}: duplicate Step name "${canonical.name}"`);
      return;
    }
    if (!rawHour) {
      errors.push(`${label} (${canonical.name}): missing Hour`);
      return;
    }
    const time = clock(rawHour);
    if (!time) {
      errors.push(`${label} (${canonical.name}): invalid Hour "${rawHour}"`);
      return;
    }
    seen.add(canonical.id);
    const step = {
      id: canonical.id,
      time,
      title: canonical.name,
      type: canonical.type,
      location: 'Venue',
      isMainSongRequired: canonical.isMainSongRequired,
    };
    if (canonical.optionalFlag) step.optionalFlag = canonical.optionalFlag;
    if (canonical.anchorId) anchorIds[canonical.id] = canonical.anchorId;
    steps.push(step);
  });
  return { steps, anchorIds };
}

// Legacy Docs used the nine-column Step ID table. Keep reading them so existing
// weddings can still be imported while the customer template moves to the
// canonical 3-column contract.
function mapLegacyTimeline(source, warnings, errors) {
  const rows = table(source, [
    'Step ID',
    'Time',
    'Title',
    'Type',
    'Location',
    'Anchor ID',
    'Main Song Required',
    'Optional Flag',
    'Notes',
  ]);
  const steps = [];
  const anchorIds = {};
  for (const row of rows) {
    const id = text(row['Step ID']);
    const time = clock(row.Time);
    const title = text(row.Title);
    const type = text(row.Type)?.toUpperCase();
    if (!id || !time || !title || !['FLEXIBLE', 'HARD_ANCHOR'].includes(type)) {
      errors.push(`TIMELINE row skipped: ${JSON.stringify(row)}`);
      continue;
    }
    const step = {
      id,
      time,
      title,
      type,
      location: text(row.Location) ?? 'Venue',
      isMainSongRequired: bool(row['Main Song Required'], false),
    };
    const optional = text(row['Optional Flag'])?.toLowerCase();
    if (optional) {
      if (['oczepiny', 'dj_set'].includes(optional)) step.optionalFlag = optional;
      else warnings.push(`step ${id}: unknown Optional Flag "${optional}" ignored`);
    }
    if (text(row['Anchor ID'])) anchorIds[id] = text(row['Anchor ID']);
    parseTimelineNotes(step, row.Notes, warnings);
    steps.push(step);
  }
  return { steps, anchorIds };
}

function resolveSatelliteStep(steps, row, section, warnings) {
  const byName = Object.prototype.hasOwnProperty.call(row, 'Step name');
  const value = text(byName ? row['Step name'] : row['Step ID']);
  if (!value) {
    warnings.push(`${section} row skipped: missing ${byName ? 'Step name' : 'Step ID'}`);
    return null;
  }
  if (byName) {
    const canonical = canonicalStepByName(value);
    if (!canonical) {
      warnings.push(`${section} row skipped: unknown Step name "${value}"`);
      return null;
    }
    const step = steps.find((entry) => entry.id === canonical.id);
    if (!step) {
      warnings.push(`${section} row skipped: ${canonical.name} is not in the timeline`);
      return null;
    }
    return step;
  }
  const step = steps.find((entry) => entry.id === value);
  if (!step) warnings.push(`${section} row skipped: unknown Step ID "${value}"`);
  return step ?? null;
}

function mergeStepRows(steps, rows, apply, { section = 'SATELLITE', warnings = [] } = {}) {
  for (const row of rows) {
    const step = resolveSatelliteStep(steps, row, section, warnings);
    if (step) apply(step, row);
  }
}

function mapWitnesses(source, warnings = []) {
  const rows = table(source, ['Witness ID', 'Name', 'Language', 'Phone', 'Email']);
  if (!rows.length) return undefined;

  return rows.reduce((witnesses, row) => {
    const id = slug(row['Witness ID']);
    const name = text(row.Name);
    const rawLanguage = text(row.Language)?.toUpperCase();
    const language = ['PL', 'FR', 'EN'].includes(rawLanguage) ? rawLanguage : null;
    const missing = [!name && 'Name', !language && 'Language'].filter(Boolean);
    if (missing.length) {
      const label = name ? ` ${name}` : '';
      warnings.push(`WITNESSES row${label} skipped: missing ${missing.join(', ')}`);
      return witnesses;
    }
    const phone = text(row.Phone);
    const email = text(row.Email);
    witnesses.push({
      id,
      name,
      language,
      ...(phone || email ? { contact: { ...(phone ? { phone } : {}), ...(email ? { email } : {}) } } : {}),
    });
    return witnesses;
  }, []);
}

const GAME_REQUESTS = new Set(['YES', 'NO', 'UNDECIDED']);

function mapGames(source, warnings = []) {
  const rows = table(source, [
    'Game',
    'Requested',
    'Requested by',
    'Languages',
    'Existing questions',
    'Requires photographer',
    'Notes',
  ]);
  return {
    enabled: rows.length > 0,
    questionLists: rows.map((row) => {
      const notes = text(row.Notes) ?? '';
      const docId = /question list doc:\s*([^\s;,]+)/i.exec(notes)?.[1] ?? null;
      const title = text(row.Game) ?? 'Game';
      const normalizedTitle = title.toLowerCase();
      const gameType = /wiedz/.test(normalizedTitle)
        ? 'TEST_WIEDZY'
        : /zgodn/.test(normalizedTitle)
          ? 'TEST_ZGODNOSCI'
          : 'OTHER';
      const requestedRaw = text(row.Requested);
      const requested = requestedRaw?.toUpperCase();
      if (!requested) {
        warnings.push(`GAMES: ${title}: missing Requested`);
      } else if (!GAME_REQUESTS.has(requested)) {
        warnings.push(
          `GAMES: ${title}: invalid Requested "${requestedRaw}" (expected YES, NO or UNDECIDED)`,
        );
      }
      return {
        id: slug(title),
        title,
        gameType,
        ...(GAME_REQUESTS.has(requested) ? { requested } : {}),
        enabled: requested !== 'NO',
        requiresPhotographer: bool(row['Requires photographer']),
        sourceDocId: docId ?? undefined,
        status: 'AVAILABLE',
      };
    }),
  };
}

// `## SPEECHES` -> `Speech mode: OFF | LIGHT | COMPLEX`. The Doc is the only
// source for the wedding-level mode, so a missing or invalid value must warn
// and leave `speechMode` unset instead of inferring OFF. The section's speech
// table stays documentation only; speech records live in the encrypted bundle.
function mapSpeechMode(source, warnings = []) {
  if (!source) return undefined;
  const raw = text(kv(source, 'Speech mode'));
  const mode = raw ? normalizeSpeechMode(raw.toUpperCase()) : null;
  if (!mode) {
    warnings.push(
      raw
        ? `SPEECHES: invalid Speech mode "${raw}" (expected OFF, LIGHT or COMPLEX)`
        : 'SPEECHES: missing Speech mode (expected OFF, LIGHT or COMPLEX)',
    );
    return undefined;
  }
  return mode;
}

function mapMusicians(source, warnings = []) {
  const raw = text(kv(source, 'Musician expected'));
  const expected = bool(raw, null);
  if (expected === null) {
    warnings.push(
      raw
        ? `MUSICIANS: invalid Musician expected "${raw}" (expected true or false)`
        : 'MUSICIANS: missing Musician expected (expected true or false)',
    );
  }
  return { expected: expected ?? false, items: [] };
}

function mapPhotoPlan(source, warnings = []) {
  const groups = subTable(source, 'Group Photos', ['Group ID', 'Label']).reduce((items, row) => {
    const id = text(row['Group ID']);
    const label = text(row.Label);
    if (!id || !label) {
      warnings.push(`GROUP PHOTOS: row skipped: missing ${!id ? 'Group ID' : 'Label'}`);
      return items;
    }
    items.push({ id: slug(id), label });
    return items;
  }, []);
  const location = text(kv(source, 'Group photos location'));
  if (!location) warnings.push('GROUP PHOTOS: missing location');
  return {
    sunset: {
      // Sunset is an application snapshot produced by the sunrise-sunset.org
      // lookup at publish/import time; it is never read from the Doc.
      provider: 'sunrise-sunset.org',
      status: 'UNAVAILABLE',
    },
    miniSession: (() => {
      const enabled = bool(kv(source, 'Mini session enabled'));
      if (enabled === null) warnings.push('MINI SESSION: missing enabled');
      return {
        enabled: enabled ?? false,
        // The lead time is runtime/admin data, not a Doc value.
        location: text(kv(source, 'Mini session location')),
        backupLocation: text(kv(source, 'Mini session backup location')),
      };
    })(),
    groupPhotos: {
      location,
      description: text(kv(source, 'Group photos description')),
      groups,
    },
  };
}

function sourceFor(type, location) {
  const cleanType = text(type)?.toUpperCase();
  const value = text(location);
  if (!cleanType && !value) return undefined;
  if (cleanType === 'CUSTOMER_FILE') {
    return { type: 'CUSTOMER_FILE', fileRef: value ?? undefined };
  }
  if (value && /youtube/i.test(value)) return { type: 'YOUTUBE', url: value };
  if (value && /spotify/i.test(value)) return { type: 'SPOTIFY', url: value };
  if (value && /deezer/i.test(value)) return { type: 'DEEZER', url: value };
  if (value) return { type: 'OTHER', url: value };
  return { type: 'OTHER' };
}

function mapImportantSongs(source, warnings = []) {
  return table(source, [
    'Moment ID',
    'Moment',
    'Title',
    'Artist',
    'Version',
    'Source type',
    'File / Link',
    'Notes',
  ]).reduce((songs, row) => {
    const momentId = text(row['Moment ID']);
    const moment = text(row.Moment)?.toUpperCase();
    const title = text(row.Title);
    const artist = text(row.Artist);
    const sourceType = text(row['Source type']);
    const missing = [
      !momentId && 'Moment ID',
      !moment && 'Moment',
      !title && 'Title',
      !artist && 'Artist',
      !sourceType && 'Source type',
    ].filter(Boolean);
    if (missing.length) {
      warnings.push(`IMPORTANT SONGS row skipped: missing ${missing.join(', ')}`);
      return songs;
    }
    const normalizedMoment =
      moment === 'CAKE_CUTTING' ? 'CAKE' : moment === 'FIRST_DANCE' ? 'FIRST_DANCE' : moment;
    songs.push({
      id: slug(momentId),
      moment: ['GRAND_ENTRANCE', 'CAKE', 'FIRST_DANCE', 'PARENTS_DANCE', 'LAST_DANCE', 'CUSTOM'].includes(
        normalizedMoment,
      )
        ? normalizedMoment
        : 'CUSTOM',
      title,
      artist,
      version: text(row.Version),
      source: sourceFor(sourceType, row['File / Link']),
      note: text(row.Notes) || undefined,
    });
    return songs;
  }, []);
}

function normalizeDiscoPoloPolicy(value) {
  const clean = text(value)?.toLowerCase();
  if (!clean) return null;
  if (['no', 'false'].includes(clean)) return 'NO';
  if (['yes', 'true'].includes(clean)) return 'YES';
  if (['on request', 'on_request', 'on-request', 'request', 'by request'].includes(clean)) {
    return 'ON_REQUEST';
  }
  return null;
}

function normalizeAttractionType(value) {
  const clean = text(value)?.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (['photo booth', 'photobooth', 'fotobudka'].includes(clean)) return 'PHOTO_BOOTH';
  if (['guest book', 'guestbook', 'księga gości', 'ksiega gosci'].includes(clean)) {
    return 'GUEST_BOOK';
  }
  if (['polaroid', 'polaroids', 'polaroidy', 'instax', 'instant photos'].includes(clean)) {
    return 'POLAROIDS';
  }
  return 'OTHER';
}

function paddedClock(value) {
  const clean = clock(value);
  if (!clean) return null;
  const [hour, minute] = clean.split(':');
  return `${hour.padStart(2, '0')}:${minute}`;
}

function clockMinutes(value) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function mapAttractions(source, warnings = []) {
  const rows = table(source, [
    'Attraction ID',
    'Type',
    'Name',
    'Start',
    'End',
    'Location',
    'Provider',
    'Notes',
  ]);

  return rows.reduce((items, row) => {
    const attractionId = text(row['Attraction ID']);
    const typeValue = text(row.Type);
    const name = text(row.Name);
    const startTime = paddedClock(row.Start);
    const endTime = paddedClock(row.End);
    const location = text(row.Location);
    if (!name) {
      warnings.push('ATTRACTIONS row skipped: missing name');
      return items;
    }
    const missing = [
      !attractionId && 'Attraction ID',
      !typeValue && 'Type',
      !location && 'Location',
      !text(row.Start) && 'Start',
      !text(row.End) && 'End',
    ].filter(Boolean);
    if (missing.length) {
      warnings.push(`attraction ${name}: missing ${missing.join(', ')}; row skipped`);
      return items;
    }
    if (!startTime || !endTime) {
      warnings.push(`attraction ${name}: invalid start/end time; row skipped`);
      return items;
    }
    if (clockMinutes(endTime) <= clockMinutes(startTime)) {
      warnings.push(`attraction ${name}: end must be after start; row skipped`);
      return items;
    }

    items.push({
      id: slug(attractionId, 'attraction'),
      type: normalizeAttractionType(typeValue),
      name,
      startTime,
      endTime,
      location,
      provider: text(row.Provider) ?? undefined,
      // Notes is optional in the Doc but required by the cartridge schema, so a
      // missing cell degrades to an empty string instead of an invalid record.
      notes: text(row.Notes) ?? '',
    });
    return items;
  }, []);
}

function mapMusicPolicy(source, importantSongs, warnings = []) {
  const parsedDiscoPolo = normalizeDiscoPoloPolicy(kv(source, 'Disco Polo policy'));
  if (!parsedDiscoPolo) {
    warnings.push('MUSIC POLICY: Disco Polo policy missing or unrecognised; defaulting to NO');
  }
  const mustPlay = subTable(source, 'Must Play', ['Song ID', 'Track', 'Note']).reduce(
    (items, row) => {
      const id = text(row['Song ID']);
      const track = text(row.Track);
      const missing = [!id && 'Song ID', !track && 'Track'].filter(Boolean);
      if (missing.length) {
        warnings.push(`MUSIC POLICY Must Play row skipped: missing ${missing.join(', ')}`);
        return items;
      }
      items.push({ id: slug(id), track, note: text(row.Note) });
      return items;
    },
    [],
  );
  const doNotPlay = subTable(source, 'Do Not Play', ['Track']).reduce((items, row) => {
    const track = text(row.Track);
    if (!track) {
      warnings.push('MUSIC POLICY Do Not Play row skipped: missing Track');
      return items;
    }
    items.push({ track });
    return items;
  }, []);
  return {
    discoPoloPolicy: parsedDiscoPolo ?? 'NO',
    mustPlay,
    doNotPlay,
    importantSongs,
  };
}

function mapKitchen(source) {
  return {
    courses: subTable(source, 'Courses', [
      'Course ID',
      'Name',
      'Time',
      'Service Mode',
      'Dietary notes',
    ]).map((row) => ({
      id: slug(row['Course ID']),
      name: text(row.Name),
      time: clock(row.Time),
      serviceMode: ['TABLE_SERVICE', 'BUFFET'].includes(
        text(row['Service Mode'])?.toUpperCase(),
      )
        ? text(row['Service Mode']).toUpperCase()
        : 'TABLE_SERVICE',
      dietaryNotes: text(row['Dietary notes']),
    })),
    dietaryCounts: {
      vegetarian: int(kv(source, 'Vegetarian')),
      vegan: int(kv(source, 'Vegan')),
      glutenFree: int(kv(source, 'Gluten free')),
    },
    vendorMeals: subTable(source, 'Vendor Meals', ['Vendor', 'Count', 'Time', 'Notes']).map((row) => ({
      vendor: text(row.Vendor),
      count: int(row.Count),
      time: clock(row.Time),
      notes: text(row.Notes),
    })),
    serviceAnchors: subTable(source, 'Service Anchors', ['Anchor ID', 'Time', 'Label']).map((row) => ({
      id: slug(row['Anchor ID']),
      time: clock(row.Time),
      label: text(row.Label),
    })),
  };
}

function mapMandatory(source) {
  const rows = table(source, ['Field', 'Time']);
  const get = (name) => {
    const target = normalizeKey(name);
    const row = rows.find((entry) => normalizeKey(entry.Field) === target);
    return row?.Time ?? null;
  };
  return {
    firstGuestsArrival: clock(get('First guests arrival')),
    closureTime: clock(get('Wedding closure')),
    closureExtensionAllowed: bool(get('Closure extension allowed'), false),
    closureExtensionUntil: clock(get('Closure extension until')),
    cakeServiceMode: ['KITCHEN_RETURN', 'CUT_IN_PLACE'].includes(
      text(get('Cake service mode'))?.toUpperCase(),
    )
      ? text(get('Cake service mode')).toUpperCase()
      : undefined,
    lastSong: text(get('Last song')),
  };
}

export function googleDocTemplateToCartridge(
  parsed,
  {
    now = new Date(),
    weddingId: providedWeddingId = null,
    servicePackage: providedServicePackage = null,
  } = {},
) {
  const errors = [];
  const warnings = [];
  const event = section(parsed, 'EVENT');
  const timeline = section(parsed, 'TIMELINE');
  if (!event) errors.push('Missing EVENT section');
  if (!timeline) errors.push('Missing TIMELINE section');

  const coupleSource = section(parsed, 'COUPLE IDENTITY');
  const brideFirstName = text(kv(coupleSource, 'Bride first name'));
  const groomFirstName = text(kv(coupleSource, 'Groom first name'));
  const brideNationalities = list(kv(coupleSource, 'Bride nationality'));
  const groomNationalities = list(kv(coupleSource, 'Groom nationality'));
  const commonLanguages = list(kv(coupleSource, 'Shared languages'));
  // Legacy Docs may still carry these fields; the current template and field
  // map do not. Context wins, then the legacy line keeps old fixtures readable.
  const weddingId = text(providedWeddingId) ?? text(kv(event, 'Wedding ID'));
  const date = text(kv(event, 'Date'));
  const dateISO =
    resolveEventDateISO({ date }) ?? text(kv(event, 'Date ISO'));
  const syncPin = text(kv(event, 'Sync PIN'));
  const servicePackage = normalizeServicePackage(
    text(providedServicePackage) ?? text(kv(event, 'Service package')),
  );
  if (!servicePackage) {
    errors.push(
      'EVENT: Service package must be provided by the admin (HOST_ONLY, DJ_MC or HOST_AND_DJ_VIP)',
    );
  }
  if (!weddingId) {
    errors.push('EVENT: Wedding ID is required from the Drive context');
  } else if (!WEDDING_ID.test(weddingId)) {
    errors.push(
      `EVENT: Wedding ID "${weddingId}" must match Name&Name-UM-YYYY-MM-NNN, e.g. Weronika&Guillaume-UM-2027-04-002`,
    );
  }
  if (!brideFirstName) errors.push('COUPLE IDENTITY: Bride first name is required');
  if (!groomFirstName) errors.push('COUPLE IDENTITY: Groom first name is required');
  const missingCoupleFields = [
    !brideNationalities.length && 'Bride nationality',
    !groomNationalities.length && 'Groom nationality',
    !commonLanguages.length && 'Shared languages',
  ].filter(Boolean);
  if (missingCoupleFields.length) {
    warnings.push(`COUPLE IDENTITY: missing ${missingCoupleFields.join(', ')}`);
  }
  if (!date) errors.push('EVENT: Date is required');
  if (!dateISO) {
    errors.push('EVENT: Date must use DD.MM.YYYY so Date ISO can be derived');
  }

  const { steps, anchorIds } = mapTimeline(timeline, warnings, errors);
  if (!steps.length) errors.push('TIMELINE: no valid steps mapped');

  const djRows = table(section(parsed, 'DJ CUES'), [
    'Step name',
    'Playlist',
    'Track',
    'Cutoff',
    'Note',
  ]);
  const legacyDjRows = djRows.length
    ? []
    : table(section(parsed, 'DJ CUES'), ['Step ID', 'Playlist', 'Track', 'Cutoff', 'Note']);
  for (const rows of [djRows, legacyDjRows]) {
    mergeStepRows(
      steps,
      rows,
      (step, row) => {
        step.dj = {
          playlist: text(row.Playlist),
          track: text(row.Track),
          cutoff: clock(row.Cutoff),
          note: text(row.Note),
        };
      },
      { section: 'DJ CUES', warnings },
    );
  }

  mapStepNotes(section(parsed, 'NOTES'), steps, warnings);

  const subTaskRows = table(section(parsed, 'SUBTASKS'), [
    'Step name',
    'Subtask ID',
    'Label',
    'Done',
  ]);
  const legacySubTaskRows = subTaskRows.length
    ? []
    : table(section(parsed, 'SUBTASKS'), ['Step ID', 'Subtask ID', 'Label', 'Done']);
  for (const rows of [subTaskRows, legacySubTaskRows]) {
    mergeStepRows(
      steps,
      rows,
      (step, row) => {
        step.subTasks = step.subTasks ?? [];
        const label = text(row.Label);
        if (label) step.subTasks.push(label);
      },
      { section: 'SUBTASKS', warnings },
    );
  }

  const importantSongsSource = section(parsed, 'IMPORTANT SONGS');
  const importantSongs = mapImportantSongs(importantSongsSource, warnings);
  const firstDanceStep = steps.find((step) => /first dance/i.test(step.title));
  if (firstDanceStep && importantSongsSource) {
    const firstDanceSong = importantSongs.find((song) => song.moment === 'FIRST_DANCE');
    if (!firstDanceSong) {
      warnings.push('FIRST DANCE: missing FIRST_DANCE song');
    } else {
      const missing = [
        !firstDanceSong.artist && 'artist',
        !firstDanceSong.title && 'title',
      ].filter(Boolean);
      if (missing.length) {
        warnings.push(`FIRST DANCE: missing song ${missing.join(', ')}`);
      }
      firstDanceStep.song = {
        artist: firstDanceSong.artist ?? '',
        title: firstDanceSong.title ?? '',
        // Note is optional in the Doc but required by the step schema.
        Note: firstDanceSong.note ?? '',
        source: firstDanceSong.source?.type ?? 'OTHER',
      };
    }
  }
  const musicSource = section(parsed, 'MUSIC POLICY');
  const musicPolicy = musicSource ? mapMusicPolicy(musicSource, importantSongs, warnings) : undefined;
  const attractionsSource = section(parsed, 'ATTRACTIONS');
  const attractions = attractionsSource ? mapAttractions(attractionsSource, warnings) : undefined;
  const guestRequests = section(parsed, 'GUEST REQUESTS');

  const cakeSource = section(parsed, 'CAKE');
  const cake = cakeSource
    ? (() => {
        const time = clock(kv(cakeSource, 'Time'));
        const cuttingSong = text(kv(cakeSource, 'Cutting song'));
        const sparklers = bool(kv(cakeSource, 'Sparklers'));
        const missing = [
          !time && 'Time',
          !cuttingSong && 'Cutting song',
          sparklers === null && 'Sparklers',
        ].filter(Boolean);
        if (missing.length) {
          warnings.push(`CAKE: missing ${missing.join(', ')}`);
        }
        return {
          time,
          cuttingSong,
          sparklers,
        };
      })()
    : undefined;

  const gamesSource = section(parsed, 'GAMES');
  const games = gamesSource ? mapGames(gamesSource, warnings) : undefined;
  const gameLists = Array.isArray(games?.questionLists) ? games.questionLists : [];
  const speechMode = mapSpeechMode(section(parsed, 'SPEECHES'), warnings);

  const kitchenSource = section(parsed, 'KITCHEN');
  const kitchen = kitchenSource ? mapKitchen(kitchenSource) : undefined;
  const mandatorySettings = mapMandatory(section(parsed, 'MANDATORY STEPS'));
  const kitchenCourses = (kitchen?.courses ?? []).filter((course) => course.id && course.time);
  const timelineTimes = new Map(steps.map((step) => [step.id, step.time]));
  const settings = {
    ...mandatorySettings,
    kitchenServices: kitchenCourses.map((course) => ({
      id: course.id,
      name: course.name,
      time: course.time,
      serviceMode: course.serviceMode,
    })),
  };
  const stepsWithMandatory = applyMandatorySettings({ steps }, settings);
  for (const course of kitchenCourses) {
    const timelineTime = timelineTimes.get(course.id);
    if (timelineTime && course.time && timelineTime !== course.time) {
      warnings.push(
        `KITCHEN: ${course.name ?? course.id} time ${course.time} differs from TIMELINE ${timelineTime}; using KITCHEN`,
      );
    }
  }
  const cakeStep =
    stepsWithMandatory.find((step) => step.id === 'step_05') ??
    stepsWithMandatory.find((step) => /cake/i.test(step.title ?? ''));
  if (cake?.time && cakeStep) {
    if (cakeStep.time && cakeStep.time !== cake.time) {
      warnings.push(
        `CAKE: Time ${cake.time} differs from TIMELINE ${cakeStep.time}; using CAKE`,
      );
    }
    cakeStep.time = cake.time;
    cakeStep.type = 'HARD_ANCHOR';
  }
  const hardAnchors = deriveHardAnchors(stepsWithMandatory);
  const ceremony = mapCeremony(event);
  const ceremonyStep = stepsWithMandatory.find((step) => /ceremony/i.test(step.title ?? ''));
  if (ceremony.type && ceremonyStep) {
    ceremonyStep.ceremony = ceremony;
    delete ceremonyStep.ceremonyType;
    delete ceremonyStep.ceremonyLocation;
  }
  const ceremonyScript = section(parsed, 'CEREMONY SCRIPT');
  if (ceremonyScript) mapCeremonyScript(ceremonyScript, stepsWithMandatory);
  mapCeremonySubSteps(section(parsed, 'CEREMONY SUBSTEPS'), stepsWithMandatory, warnings);

  // Game steps own their question list. Match by id/title, then remove the old
  // optionalFlag/gameId indirection.
  for (const step of stepsWithMandatory) {
    const match =
      gameLists.find((list) => list?.id && list.id === step.gameId) ??
      gameLists.find(
        (list) =>
          typeof list?.title === 'string' &&
          normalizeKey(list.title) === normalizeKey(step.title),
      );
    if (match) step.game = match;
    delete step.gameId;
    if (step.optionalFlag === 'games' || step.optionalFlag === 'wishes') {
      delete step.optionalFlag;
    }
  }
  const languagesSource = section(parsed, 'LANGUAGES');
  if (!languagesSource) errors.push('Missing LANGUAGES section');
  const supportedLanguages = languageCodes(kv(languagesSource, 'Supported'));
  if (languagesSource && supportedLanguages.length === 0) {
    errors.push('LANGUAGES: Supported must list at least one ISO 639-1 code');
  }
  const invalidLanguages = supportedLanguages.filter((code) => !/^[A-Z]{2}$/.test(code));
  if (invalidLanguages.length > 0) {
    errors.push('LANGUAGES: Supported must contain two-letter ISO 639-1 codes');
  }
  const extensions = {
    stepAnchorIds: anchorIds,
    dateISO,
    languages: {
      supported: supportedLanguages.filter((code) => /^[A-Z]{2}$/.test(code)),
      ...(languagesSource && text(kv(languagesSource, 'Default content'))
        ? { defaultContent: text(kv(languagesSource, 'Default content')) }
        : {}),
      ...(languagesSource && text(kv(languagesSource, 'Notes'))
        ? { notes: text(kv(languagesSource, 'Notes')) }
        : {}),
    },
    ...(kitchen ? { kitchen } : {}),
    ...(guestRequests
      ? { guestRequestRules: text(kv(guestRequests, 'Rules')) }
      : {}),
  };

  const calculated = calculateStepDurations(stepsWithMandatory, {
    closureTime: mandatorySettings.closureTime,
  });
  if (calculated.errors.length) {
    errors.push(...calculated.errors.map((message) => `TIMELINE: ${message}`));
  }

  const mediaTeam = table(section(parsed, 'MEDIA TEAM'), [
    'Team ID',
    'Role',
    'Name',
    'Phone',
    'Start',
    'End',
    'Deliverables',
    'Notes',
  ]).map((row) => ({
    id: slug(row['Team ID']),
    role: ['PHOTO', 'VIDEO', 'DRONE'].includes(text(row.Role)?.toUpperCase())
      ? text(row.Role).toUpperCase()
      : 'PHOTO',
    name: text(row.Name) ?? row['Team ID'],
    phone: text(row.Phone),
    startTime: clock(row.Start),
    endTime: clock(row.End),
    deliverables: list(row.Deliverables),
    notes: text(row.Notes),
  }));
  const photographerAvailable = mediaTeam.some((member) => member.role === 'PHOTO');
  const oczepiny = mapOczepiny(section(parsed, 'OCZEPINY'), warnings);
  if (oczepiny) {
    oczepiny.winnerPhoto.photographerAvailable = photographerAvailable;
  }

  const cartridge = {
    schemaVersion: '1.1',
    weddingId,
    coupleProfile: {
      bride: {
        firstName: brideFirstName,
        nationalities: brideNationalities,
      },
      groom: {
        firstName: groomFirstName,
        nationalities: groomNationalities,
      },
      commonLanguages,
    },
    date,
    ...(syncPin ? { syncPin } : {}),
    servicePackage,
    childrenExpected: bool(kv(event, 'Children expected'), false),
    culturalRules: mapCulturalRules(
      table(section(parsed, 'CULTURAL RULES'), ['Rule', 'Status', 'Note']),
      warnings,
    ),
    steps: stepsWithMandatory,
    hardAnchors,
    viewVisibility: mapViewVisibility(section(parsed, 'VIEW VISIBILITY')),
    mediaTeam,
    musicians: mapMusicians(section(parsed, 'MUSICIANS'), warnings),
    photoPlan: mapPhotoPlan(section(parsed, 'PHOTO PLAN'), warnings),
    oczepiny,
    witnesses: mapWitnesses(section(parsed, 'WITNESSES'), warnings),
    cake,
    musicPolicy,
    attractions,
    ...(speechMode ? { speechMode } : {}),
    extensions,
    privacy: normalizePrivacy(),
    demographics: mapDemographics(section(parsed, 'DEMOGRAPHICS'), warnings),
  };

  for (const key of Object.keys(cartridge)) {
    if (cartridge[key] === undefined) delete cartridge[key];
  }
  return {
    cartridge: stripUndefined(cartridge),
    errors,
    warnings,
    mappedSections: parsed?.sections?.map((entry) => entry.marker) ?? [],
    now,
  };
}

function mapViewVisibility(source) {
  const rows = table(source, ['Role', 'Section', 'Visible']);
  if (!rows.length) return undefined;
  const result = {};
  for (const row of rows) {
    const role = text(row.Role)?.toLowerCase();
    const sectionName = text(row.Section);
    if (!role || !sectionName) continue;
    result[role] = result[role] ?? {};
    result[role][sectionName] = bool(row.Visible, false);
  }
  return result;
}
