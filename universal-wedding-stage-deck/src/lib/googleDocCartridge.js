import { applyCalculatedDurations } from './stepDurations.js';
import { deriveHardAnchors } from './hardAnchors.js';
import { applyMandatorySettings } from './mandatorySteps.js';

// Matches the first HH:MM clock at the start of a loose time string. Accepts
// `22.15`, `15h00`, ranges (`15:40/16:00`, `22:00-22:30`, `18:00–20:00`) and
// single-digit hours; the importer normalizes them to a strict `HH:MM`.
const CLOCK_TOKEN = /^([01]?\d|2[0-3])[:.hH]([0-5]\d)/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

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

function slug(value, fallback = 'item') {
  return (
    text(value)
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || fallback
  );
}

function normalizeHostingMode(value) {
  return text(value)?.toUpperCase() === 'HOST_ONLY' ? 'HOST_ONLY' : 'HOST_AND_DJ';
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

function parseJsonBlock(source) {
  const block = source?.codeBlocks?.find((entry) => entry.lang === 'json') ?? source?.codeBlocks?.[0];
  if (!block?.text) return null;
  try {
    return JSON.parse(block.text);
  } catch {
    return null;
  }
}

function mapCulturalRules(rows, warnings = []) {
  const keyMap = { stolat: 'sto_lat', gorzko: 'gorzko', breadsalt: 'bread_salt' };
  const labels = { sto_lat: 'Sto Lat', gorzko: 'Gorzko', bread_salt: 'Bread & Salt' };
  const rules = {};
  for (const row of rows) {
    const key = keyMap[normalizeKey(row.Rule)];
    if (!key) continue;
    rules[key] = {};
    if (text(row.Status)) rules[key].status = text(row.Status);
    if (key === 'bread_salt' && text(row.Note)) rules[key].note = text(row.Note);
  }
  for (const key of Object.keys(labels)) {
    if (!rules[key]?.status) {
      warnings.push(`CULTURAL RULES: missing ${labels[key]} status`);
    }
  }
  return rules;
}

function mapCeremony(event) {
  const type = text(kv(event, 'Ceremony type'))?.toUpperCase() ?? null;
  return {
    type: ['RELIGIOUS', 'CIVIL', 'HUMANIST'].includes(type) ? type : null,
    mcSupportRequested: bool(kv(event, 'Ceremony MC support'), false),
    mcTranslationHelpRequested: bool(kv(event, 'Ceremony MC translation help'), false),
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

function mapOczepiny(source) {
  const throwings = {};
  const rawThrowings = text(kv(source, 'Throwings')) ?? '';
  const throwingKeys = { veil: 'veil', bouquet: 'bouquet', bowtie: 'bowTie', cravat: 'cravat' };
  for (const part of rawThrowings.split(',')) {
    const [rawKey, value] = part.split('=').map((item) => item.trim());
    const key = throwingKeys[normalizeKey(rawKey)];
    if (!key) continue;
    throwings[key] = bool(value, false);
  }
  const subEvents = table(source, [
    'Sub-event ID',
    'Title',
    'Deferable',
    'Skippable',
  ]).map((row) => ({
    id: slug(row['Sub-event ID']),
    title: text(row.Title) ?? row['Sub-event ID'],
    deferable: bool(row.Deferable, false),
    skippable: bool(row.Skippable, false),
  }));

  return {
    enabled: bool(kv(source, 'Enabled'), true),
    order: text(kv(source, 'Order')) ?? text(kv(source, 'Oczepiny variant')),
    variant: text(kv(source, 'Oczepiny variant')) ?? text(kv(source, 'Order')),
    anchorId: text(kv(source, 'Anchor ID')),
    toss: text(kv(source, 'Toss')),
    ties: text(kv(source, 'Ties')),
    throwings: Object.keys(throwings).length ? throwings : undefined,
    game: {
      enabled: bool(kv(source, 'Game enabled'), false),
    },
    countdown: { mode: text(kv(source, 'Countdown mode')) ?? 'MC' },
    winnerPhoto: {
      enabled: bool(kv(source, 'Winner photo enabled'), false),
      photographerCue: text(kv(source, 'Winner photo cue')),
      winnersOnly: bool(kv(source, 'Winners only photo'), false),
      winnersWithCouple: bool(kv(source, 'Winners + couple photo'), false),
      photographerAvailable: bool(kv(source, 'Photographer available'), false),
    },
    photographerBriefed: {
      notes: text(kv(source, 'Photographer briefed notes')) ?? '',
    },
    music: {
      enabled: bool(kv(source, 'Music enabled'), false),
      track: text(kv(source, 'Music track')),
      playlist: list(kv(source, 'Music playlist')),
    },
    props: list(kv(source, 'Props')),
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

function mapTimeline(source, warnings) {
  const rows = table(source, [
    'Step ID',
    'Time',
    'Duration (min)',
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
      warnings.push(`TIMELINE row skipped: ${JSON.stringify(row)}`);
      continue;
    }
    const step = {
      id,
      time,
      durationMin: int(row['Duration (min)'], 1),
      title,
      type,
      location: text(row.Location) ?? 'Venue',
      isMainSongRequired: bool(row['Main Song Required'], false),
    };
    const optional = text(row['Optional Flag']);
    if (optional) step.optionalFlag = optional;
    if (text(row['Anchor ID'])) anchorIds[id] = text(row['Anchor ID']);
    parseTimelineNotes(step, row.Notes, warnings);
    steps.push(step);
  }
  return { steps, anchorIds };
}

function mergeStepRows(steps, rows, apply) {
  for (const row of rows) {
    const step = steps.find((entry) => entry.id === text(row['Step ID']));
    if (step) apply(step, row);
  }
}

function mapSpeeches(source) {
  const rows = table(source, [
    'Speech ID',
    'Order',
    'Speaker',
    'Relationship',
    'Time',
    'Language',
    'Delivery',
    'Consent',
    'Visible roles',
  ]);
  const scripts = new Map();
  for (const sub of source?.subSections ?? []) {
    const match = /^speech script\s+(.+)$/i.exec(sub.title);
    if (!match) continue;
    scripts.set(match[1].trim(), sub.codeBlocks?.[0]?.text ?? '');
  }
  return rows.map((row) => {
    const id = slug(row['Speech ID']);
    const storeScript = bool(row.Consent, false);
    return {
      id,
      mode: 'COMPLEX',
      speaker: {
        name: text(row.Speaker) ?? 'Speaker',
        relationship: text(row.Relationship),
      },
      order: int(row.Order, 1),
      time: clock(row.Time),
      language: text(row.Language),
      delivery: ['READ', 'MEMORIZE', 'NOTES'].includes(text(row.Delivery)?.toUpperCase())
        ? text(row.Delivery).toUpperCase()
        : 'READ',
      script: {
        text: scripts.get(id) ?? '',
        format: 'PLAIN',
        ready: Boolean(scripts.get(id)),
        source: 'GOOGLE_DOC',
      },
      consent: { storeScript },
      visibleToRoles: list(row['Visible roles']),
    };
  });
}

function mapWitnesses(source) {
  const rows = table(source, [
    'Witness ID',
    'Name',
    'Role',
    'Language',
    'Phone',
    'Email',
    'Speech IDs',
    'Notes',
  ]);
  if (!rows.length) return undefined;

  return rows.map((row) => {
    const id = slug(row['Witness ID']);
    const contact = {
      phone: text(row.Phone),
      email: text(row.Email),
    };
    const language = text(row.Language)?.toUpperCase();
    const witness = {
      id,
      name: text(row.Name) ?? id,
      role: text(row.Role) ?? 'Witness',
      speechIds: list(row['Speech IDs']).map((speechId) => slug(speechId)),
    };
    if (['PL', 'FR', 'EN'].includes(language)) witness.language = language;
    if (contact.phone || contact.email) witness.contact = contact;
    if (text(row.Notes)) witness.notes = text(row.Notes);
    return witness;
  });
}

function mapGames(source) {
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
      return {
        id: slug(title),
        title,
        gameType,
        enabled: !/^no$/i.test(text(row.Requested) ?? ''),
        requiresPhotographer: bool(row['Requires photographer']),
        sourceDocId: docId ?? undefined,
        status: 'AVAILABLE',
        questions: [],
      };
    }),
  };
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
      provider: text(kv(source, 'Sunset provider')),
      latitude: Number(kv(source, 'Sunset latitude')) || undefined,
      longitude: Number(kv(source, 'Sunset longitude')) || undefined,
      lastFetchedAt: text(kv(source, 'Sunset last fetched at')),
      sunsetTime: clock(kv(source, 'Sunset time')),
      goldenHourStart: clock(kv(source, 'Golden hour start')),
      civilTwilightEnd: clock(kv(source, 'Civil twilight end')),
      status: text(kv(source, 'Sunset status'))?.toUpperCase() ?? 'UNAVAILABLE',
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
      stepId: text(kv(source, 'Group photos step ID')),
      location,
      groups,
    },
    specialEffects: {
      sparklers: bool(kv(source, 'Sparklers')),
      fire: bool(kv(source, 'Fire')),
      heavySmoke: bool(kv(source, 'Heavy smoke')),
      other: text(kv(source, 'Other effects')),
      approvals: {
        sparklers: bool(kv(source, 'Sparklers approved'), false),
        fire: bool(kv(source, 'Fire approved'), false),
        heavySmoke: bool(kv(source, 'Heavy smoke approved'), false),
        other: bool(kv(source, 'Other effects approved'), false),
      },
    },
    guestCoverage: (() => {
      const allGuests = bool(kv(source, 'Guest coverage all guests'));
      if (allGuests === null) warnings.push('GUEST COVERAGE: missing all guests');
      return {
        allGuests: allGuests ?? false,
        description: text(kv(source, 'Guest coverage description')),
        groups: list(kv(source, 'Guest coverage groups')).map((label) => ({
          id: slug(label),
          label,
        })),
      };
    })(),
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
    courses: subTable(source, 'Courses', ['Course ID', 'Name', 'Time', 'Dietary notes']).map((row) => ({
      id: slug(row['Course ID']),
      name: text(row.Name),
      time: clock(row.Time),
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
  const kitchenServices = subTable(
    source,
    'Kitchen Services',
    ['Course ID', 'Name', 'Time', 'Service Mode'],
  )
    .map((row) => {
      const id = slug(row['Course ID']);
      const time = clock(row.Time);
      if (!id || !time) return null;
      const serviceMode = ['TABLE_SERVICE', 'BUFFET'].includes(
        text(row['Service Mode'])?.toUpperCase(),
      )
        ? text(row['Service Mode']).toUpperCase()
        : 'TABLE_SERVICE';
      const course = { id, time, serviceMode };
      if (text(row.Name)) course.name = text(row.Name);
      return course;
    })
    .filter(Boolean);
  return {
    firstGuestsArrival: clock(get('First guests arrival')),
    kitchenServices,
    closureTime: clock(get('Wedding closure')),
    closureExtensionAllowed: bool(get('Closure extension allowed'), false),
    closureExtensionUntil: clock(get('Closure extension until')),
    cakeServiceMode: ['KITCHEN_RETURN', 'CUT_IN_PLACE'].includes(text(get('Cake service mode'))?.toUpperCase())
      ? text(get('Cake service mode')).toUpperCase()
      : undefined,
    lastSong: text(get('Last song')),
  };
}

function mapLiveSync(source, steps) {
  const stepIds = new Set(steps.map((step) => step.id));
  const active = text(kv(source, 'Active step ID'));
  const completed = list(kv(source, 'Completed step IDs')).filter((id) => stepIds.has(id));
  const actual = {};
  for (const part of String(kv(source, 'Actual timestamps') ?? '').split(',')) {
    const [id, value] = part.split('=').map((item) => item.trim());
    if (id && stepIds.has(id) && ISO.test(value)) actual[id] = value;
  }
  return {
    active_step_id: active && stepIds.has(active) ? active : null,
    completed_step_ids: completed,
    actual_timestamps: actual,
    step_order: steps.map((step) => step.id),
  };
}

export function googleDocTemplateToCartridge(parsed, { now = new Date() } = {}) {
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
  const weddingId = text(kv(event, 'Wedding ID'));
  const date = text(kv(event, 'Date'));
  const dateISO = text(kv(event, 'Date ISO'));
  const syncPin = text(kv(event, 'Sync PIN'));
  const hostingMode = text(kv(event, 'Service package')) ?? 'HOST_ONLY';
  if (!weddingId) errors.push('EVENT: Wedding ID is required');
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
  if (!dateISO) errors.push('EVENT: Date ISO is required');
  if (!syncPin) errors.push('EVENT: Sync PIN is required');

  const { steps, anchorIds } = mapTimeline(timeline, warnings);
  if (!steps.length) errors.push('TIMELINE: no valid steps mapped');

  const djRows = table(section(parsed, 'DJ CUES'), [
    'Step ID',
    'Playlist',
    'Track',
    'Cutoff',
    'Note',
  ]);
  mergeStepRows(steps, djRows, (step, row) => {
    step.dj = {
      playlist: text(row.Playlist),
      track: text(row.Track),
      cutoff: clock(row.Cutoff),
      note: text(row.Note),
    };
  });

  mergeStepRows(
    steps,
    table(section(parsed, 'MC CUES'), ['Step ID', 'Language', 'Timing', 'Text']),
    (step, row) => {
      const cueText = text(row.Text);
      if (!cueText) return;
      step.mcCues = step.mcCues ?? [];
      const language = text(row.Language);
      const timing = text(row.Timing);
      step.mcCues.push({
        ...(language ? { language } : {}),
        ...(timing ? { timing } : {}),
        text: cueText,
      });
    },
  );

  mergeStepRows(
    steps,
    table(section(parsed, 'SUBTASKS'), ['Step ID', 'Subtask ID', 'Label', 'Done']),
    (step, row) => {
      step.subTasks = step.subTasks ?? [];
      const label = text(row.Label);
      if (label) step.subTasks.push(label);
    },
  );

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

  const speeches = mapSpeeches(section(parsed, 'SPEECHES'));
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
          photographerCue: text(kv(cakeSource, 'Photographer cue')),
        };
      })()
    : undefined;

  const gamesSource = section(parsed, 'GAMES');
  const games = gamesSource ? mapGames(gamesSource) : undefined;
  const gameLists = Array.isArray(games?.questionLists) ? games.questionLists : [];

  const privacySource = section(parsed, 'PRIVACY');
  const privacy = privacySource
    ? {
        cloudSync: text(kv(privacySource, 'Cloud sync')) ?? 'ENCRYPTED_HOST_KEY',
        encryption: {
          alg: text(kv(privacySource, 'Encryption algorithm')),
          keyHolder: text(kv(privacySource, 'Encryption key holder')) ?? 'HOST',
          version: int(kv(privacySource, 'Encryption version'), 1),
        },
      }
    : undefined;

  const mandatorySettings = mapMandatory(section(parsed, 'MANDATORY STEPS'));
  const stepsWithMandatory = applyMandatorySettings({ steps }, mandatorySettings);
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
  const kitchenSource = section(parsed, 'KITCHEN');
  const extensionSource = section(parsed, 'EXTENSIONS');
  const extensionJson = parseJsonBlock(extensionSource);
  const extensions = {
    ...(extensionJson && typeof extensionJson === 'object' ? extensionJson : {}),
    stepAnchorIds: anchorIds,
    dateISO,
    servicePackage: text(kv(event, 'Service package')),
    ...(languagesSource
      ? {
          languages: {
            defaultContent: text(kv(languagesSource, 'Default content')),
            supported: list(kv(languagesSource, 'Supported')),
            notes: text(kv(languagesSource, 'Notes')),
          },
        }
      : {}),
    ...(kitchenSource ? { kitchen: mapKitchen(kitchenSource) } : {}),
    ...(guestRequests
      ? { guestRequestRules: text(kv(guestRequests, 'Rules')) }
      : {}),
  };

  const liveSyncSource = section(parsed, 'LIVE SYNC STATE');
  const liveSyncState = liveSyncSource
    ? mapLiveSync(liveSyncSource, stepsWithMandatory)
    : undefined;

  const calculated = applyCalculatedDurations(stepsWithMandatory, {
    closureTime: mandatorySettings.closureTime,
  });
  if (calculated.errors.length) {
    errors.push(...calculated.errors.map((message) => `TIMELINE: ${message}`));
  } else {
    stepsWithMandatory.splice(0, stepsWithMandatory.length, ...calculated.steps);
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
    syncPin,
    hostingMode: normalizeHostingMode(hostingMode),
    childrenExpected: bool(kv(event, 'Children expected'), false),
    culturalRules: mapCulturalRules(
      table(section(parsed, 'CULTURAL RULES'), ['Rule', 'Status', 'Note']),
      warnings,
    ),
    steps: stepsWithMandatory,
    hardAnchors,
    viewVisibility: mapViewVisibility(section(parsed, 'VIEW VISIBILITY')),
    mediaTeam: table(section(parsed, 'MEDIA TEAM'), [
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
    })),
    photoPlan: mapPhotoPlan(section(parsed, 'PHOTO PLAN'), warnings),
    oczepiny: mapOczepiny(section(parsed, 'OCZEPINY')),
    speeches,
    witnesses: mapWitnesses(section(parsed, 'WITNESSES')),
    cake,
    privacy,
    musicPolicy,
    attractions,
    extensions,
    ...(liveSyncState ? { liveSyncState } : {}),
    demographics: { notes: text(kv(privacySource, 'Demographics notes')) ?? undefined },
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
