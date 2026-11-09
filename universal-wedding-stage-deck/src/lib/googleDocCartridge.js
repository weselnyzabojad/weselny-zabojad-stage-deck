import { applyCalculatedDurations } from './stepDurations.js';

const CLOCK = /^([01]?\d|2[0-3]):[0-5]\d$/;
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

function clock(value) {
  const clean = text(value);
  return clean && CLOCK.test(clean) ? clean : null;
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

function mapCulturalRules(rows) {
  const keyMap = { stolat: 'sto_lat', gorzko: 'gorzko', breadsalt: 'bread_salt' };
  const rules = {};
  for (const row of rows) {
    const key = keyMap[normalizeKey(row.Rule)];
    if (!key) continue;
    rules[key] = {};
    if (text(row.Status)) rules[key].status = text(row.Status);
    if (text(row.Note)) rules[key].note = text(row.Note);
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
    'Duration (min)',
    'Deferable',
    'Skippable',
  ]).map((row) => ({
    id: slug(row['Sub-event ID']),
    title: text(row.Title) ?? row['Sub-event ID'],
    durationMin: int(row['Duration (min)'], 0),
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
      type: text(kv(source, 'Game type')),
    },
    countdown: { mode: text(kv(source, 'Countdown mode')) ?? 'MC' },
    winnerPhoto: {
      enabled: bool(kv(source, 'Winner photo enabled'), false),
      replacesWinnersDance: bool(kv(source, 'Winner photo replaces winners dance'), false),
      photographerCue: text(kv(source, 'Winner photo cue')),
      winnersOnly: bool(kv(source, 'Winners only photo'), false),
      winnersWithCouple: bool(kv(source, 'Winners + couple photo'), false),
      photographerAvailable: bool(kv(source, 'Photographer available'), false),
    },
    photographerBriefed: {
      confirmed: bool(kv(source, 'Photographer briefed'), false),
      confirmedAt: ISO.test(text(kv(source, 'Photographer briefed at')) ?? '')
        ? text(kv(source, 'Photographer briefed at'))
        : undefined,
      confirmedBy: text(kv(source, 'Photographer briefed by')),
    },
    music: {
      track: text(kv(source, 'Music track')),
      playlist: text(kv(source, 'Music playlist')),
      enabled: Boolean(text(kv(source, 'Music track')) || text(kv(source, 'Music playlist'))),
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
  if (start) step.firstDanceStartAtSec = Number(start[1]);
  const stop = /stop after\s+(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/i.exec(clean);
  if (stop && (stop[1] || stop[2])) {
    step.firstDanceStopAfterSec = Number(stop[1] ?? 0) * 60 + Number(stop[2] ?? 0);
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
    'Duration (min)',
    'Language',
    'Mic',
    'Cue',
    'Delivery',
    'Read from',
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
      durationMin: int(row['Duration (min)'], 5),
      language: text(row.Language),
      mic: text(row.Mic),
      cue: text(row.Cue),
      delivery: ['READ', 'MEMORIZE', 'NOTES'].includes(text(row.Delivery)?.toUpperCase())
        ? text(row.Delivery).toUpperCase()
        : 'READ',
      readFrom: ['PHONE', 'TABLET', 'PAPER', 'MEMORY', 'OTHER'].includes(
        text(row['Read from'])?.toUpperCase(),
      )
        ? text(row['Read from']).toUpperCase()
        : 'TABLET',
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

function mapGames(source) {
  const rows = table(source, [
    'Game',
    'Requested',
    'Requested by',
    'Languages',
    'Existing questions',
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
        sourceDocId: docId ?? undefined,
        status: 'AVAILABLE',
        questions: [],
      };
    }),
  };
}

function mapVenue(source) {
  const latitude = Number(kv(source, 'Latitude'));
  const longitude = Number(kv(source, 'Longitude'));
  const accommodationLat = Number(kv(source, 'Accommodation latitude'));
  const accommodationLng = Number(kv(source, 'Accommodation longitude'));
  return {
    address: text(kv(source, 'Address')),
    coordinates:
      Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { latitude, longitude }
        : undefined,
    timezone: text(kv(source, 'Timezone')),
    manager: {
      name: text(kv(source, 'Manager name')),
      phone: text(kv(source, 'Manager phone')),
      email: text(kv(source, 'Manager email')),
    },
    installation: {
      windowStart: clock(kv(source, 'Installation window start')),
      windowEnd: clock(kv(source, 'Installation window end')),
      latestStart: clock(kv(source, 'Installation latest start')),
      loadInMinutes: int(kv(source, 'Load-in minutes')),
      setupMinutes: int(kv(source, 'Setup minutes')),
      loadOutMinutes: int(kv(source, 'Load-out minutes')),
      accessNotes: text(kv(source, 'Access notes')),
      parking: text(kv(source, 'Parking')),
      power: text(kv(source, 'Power')),
      loadingDock: bool(kv(source, 'Loading dock')),
      elevator: bool(kv(source, 'Elevator')),
      noiseCurfew: clock(kv(source, 'Noise curfew')),
    },
    notes: text(kv(source, 'Notes')),
    accommodation: {
      name: text(kv(source, 'Accommodation name')),
      address: text(kv(source, 'Accommodation address')),
      coordinates:
        Number.isFinite(accommodationLat) && Number.isFinite(accommodationLng)
          ? { latitude: accommodationLat, longitude: accommodationLng }
          : undefined,
      distanceKm: Number(kv(source, 'Accommodation distance km')) || undefined,
      checkIn: clock(kv(source, 'Accommodation check-in')),
      checkOut: clock(kv(source, 'Accommodation check-out')),
      bookingRef: text(kv(source, 'Accommodation booking ref')),
      rooms: int(kv(source, 'Accommodation rooms')),
      contact: {
        name: text(kv(source, 'Accommodation contact name')),
        phone: text(kv(source, 'Accommodation contact phone')),
      },
      paidBy: text(kv(source, 'Accommodation paid by')),
      notes: text(kv(source, 'Accommodation notes')),
    },
    travel: {
      baselineMinutes: int(kv(source, 'Travel baseline minutes')),
      distanceKm: Number(kv(source, 'Travel distance km')) || undefined,
      originLabel: text(kv(source, 'Travel origin label')),
    },
  };
}

function mapPhotoPlan(source) {
  const groups = subTable(source, 'Group Photos', ['Group ID', 'Label']).map((row) => ({
    id: slug(row['Group ID']),
    label: text(row.Label) ?? row['Group ID'],
  }));
  return {
    sunset: {
      source: text(kv(source, 'Sunset source')),
      provider: text(kv(source, 'Sunset provider')),
      latitude: Number(kv(source, 'Sunset latitude')) || undefined,
      longitude: Number(kv(source, 'Sunset longitude')) || undefined,
      timezone: text(kv(source, 'Sunset timezone')),
      lastFetchedAt: text(kv(source, 'Sunset last fetched at')),
      sunsetTime: clock(kv(source, 'Sunset time')),
      goldenHourStart: clock(kv(source, 'Golden hour start')),
      civilTwilightEnd: clock(kv(source, 'Civil twilight end')),
      status: text(kv(source, 'Sunset status'))?.toUpperCase() ?? 'UNAVAILABLE',
    },
    miniSession: {
      enabled: bool(kv(source, 'Mini session enabled'), false),
      latestStartMinutesBeforeSunset: int(
        kv(source, 'Mini session latest start before sunset (min)'),
      ),
      durationMin: int(kv(source, 'Mini session duration (min)')),
      location: text(kv(source, 'Mini session location')),
      backupLocation: text(kv(source, 'Mini session backup location')),
    },
    groupPhotos: {
      stepId: text(kv(source, 'Group photos step ID')),
      location: text(kv(source, 'Group photos location')),
      groups,
    },
    speedFoto: {
      enabled: bool(kv(source, 'Speed foto enabled'), false),
      description: text(kv(source, 'Speed foto description')),
      durationMin: int(kv(source, 'Speed foto duration (min)')),
      music: text(kv(source, 'Speed foto music')),
    },
    specialEffects: {
      sparklers: bool(kv(source, 'Sparklers')),
      fire: bool(kv(source, 'Fire')),
      heavySmoke: bool(kv(source, 'Heavy smoke')),
      other: text(kv(source, 'Other effects')),
      permitRequired: bool(kv(source, 'Permit required')),
      venueApproved: bool(kv(source, 'Venue approved')),
      safetyBriefing: text(kv(source, 'Safety briefing')),
    },
    guestCoverage: {
      allGuests: bool(kv(source, 'Guest coverage all guests')),
      selectedGuests: int(kv(source, 'Guest coverage selected guests')),
      description: text(kv(source, 'Guest coverage description')),
      consent: text(kv(source, 'Guest coverage consent')),
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

function mapImportantSongs(source) {
  return table(source, [
    'Moment ID',
    'Moment',
    'Title',
    'Artist',
    'Version',
    'Step ID',
    'Planned time',
    'Source type',
    'File / Link',
    'Start (s)',
    'Fade out (s)',
    'Notes',
  ]).map((row) => {
    const moment = text(row.Moment)?.toUpperCase();
    const normalizedMoment =
      moment === 'CAKE_CUTTING' ? 'CAKE' : moment === 'FIRST_DANCE' ? 'FIRST_DANCE' : moment;
    return {
      id: slug(row['Moment ID']),
      moment: ['GRAND_ENTRANCE', 'CAKE', 'FIRST_DANCE', 'PARENTS_DANCE', 'LAST_DANCE', 'CUSTOM'].includes(
        normalizedMoment,
      )
        ? normalizedMoment
        : 'CUSTOM',
      title: text(row.Title),
      artist: text(row.Artist),
      version: text(row.Version),
      stepId: text(row['Step ID']) || undefined,
      plannedTime: clock(row['Planned time']) ?? undefined,
      startAtSec: int(row['Start (s)']),
      fadeOutSec: int(row['Fade out (s)']),
      source: sourceFor(row['Source type'], row['File / Link']),
      note: text(row.Notes) || undefined,
    };
  });
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
    'Booked',
    'Start',
    'End',
    'Location',
    'Provider',
    'Notes',
  ]);

  return rows.reduce((items, row) => {
    const name = text(row.Name);
    const startTime = paddedClock(row.Start);
    const endTime = paddedClock(row.End);
    if (!name) {
      warnings.push('ATTRACTIONS row skipped: missing name');
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
      id: slug(text(row['Attraction ID']) ?? name, 'attraction'),
      type: normalizeAttractionType(row.Type),
      name,
      booked: bool(row.Booked, true),
      startTime,
      endTime,
      location: text(row.Location) ?? undefined,
      provider: text(row.Provider) ?? undefined,
      notes: text(row.Notes) ?? undefined,
    });
    return items;
  }, []);
}

function mapMusicPolicy(source, importantSongs, warnings = []) {
  const windowStart = clock(kv(source, 'Request window start'));
  const windowEnd = clock(kv(source, 'Request window end'));
  const parsedDiscoPolo = normalizeDiscoPoloPolicy(kv(source, 'Disco Polo policy'));
  if (!parsedDiscoPolo) {
    warnings.push('MUSIC POLICY: Disco Polo policy missing or unrecognised; defaulting to NO');
  }
  return {
    discoPoloPolicy: parsedDiscoPolo ?? 'NO',
    mustPlay: subTable(source, 'Must Play', ['Song ID', 'Track', 'Note']).map((row) => ({
      id: slug(row['Song ID']),
      track: text(row.Track),
      note: text(row.Note),
    })),
    doNotPlay: subTable(source, 'Do Not Play', ['Song ID', 'Track', 'Reason']).map((row) => ({
      id: slug(row['Song ID']),
      track: text(row.Track),
      reason: text(row.Reason),
    })),
    requestsOpen: bool(kv(source, 'Requests open')),
    requestWindow: windowStart && windowEnd ? { start: windowStart, end: windowEnd } : undefined,
    cleanVersions: bool(kv(source, 'Clean versions')),
    licensing: text(kv(source, 'Licensing')),
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
  const mode = (name) => {
    const value = text(get(name))?.toUpperCase();
    return value === 'TABLE_SERVICE' || value === 'BUFFET' ? value : undefined;
  };
  return {
    firstGuestsArrival: clock(get('First guests arrival')),
    kitchenServices: {
      dinner: clock(get('Obiad weselny')),
      firstSupper: clock(get('Pierwsza kolacja')),
      secondSupper: clock(get('Druga kolacja')),
      thirdSupper: clock(get('Trzecia kolacja')),
    },
    kitchenServiceModes: {
      dinner: mode('Obiad weselny service'),
      firstSupper: mode('Pierwsza kolacja service'),
      secondSupper: mode('Druga kolacja service'),
      thirdSupper: mode('Trzecia kolacja service'),
    },
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
  const couple = text(kv(coupleSource, 'Couple')) ?? text(kv(event, 'Couple'));
  const weddingId = text(kv(event, 'Wedding ID'));
  const date = text(kv(event, 'Date'));
  const dateISO = text(kv(event, 'Date ISO'));
  const syncPin = text(kv(event, 'Sync PIN'));
  const hostingMode = text(kv(event, 'Service package')) ?? 'HOST_ONLY';
  if (!weddingId) errors.push('EVENT: Wedding ID is required');
  if (!couple) errors.push('COUPLE IDENTITY: Couple is required');
  if (!date) errors.push('EVENT: Date is required');
  if (!dateISO) errors.push('EVENT: Date ISO is required');
  if (!syncPin) errors.push('EVENT: Sync PIN is required');

  const { steps, anchorIds } = mapTimeline(timeline, warnings);
  if (!steps.length) errors.push('TIMELINE: no valid steps mapped');

  const hardAnchors = table(section(parsed, 'HARD ANCHORS'), [
    'Anchor ID',
    'Time',
    'Label',
    'Alert before (min)',
    'Kind',
  ]).map((row) => ({
    id: slug(row['Anchor ID']),
    time: clock(row.Time),
    label: text(row.Label) ?? row['Anchor ID'],
    alertBeforeMin: int(row['Alert before (min)'], 45),
    kind: ['VENDOR', 'SUNSET', 'TRANSPORT', 'FAMILY', 'OTHER'].includes(
      text(row.Kind)?.toUpperCase(),
    )
      ? text(row.Kind).toUpperCase()
      : 'OTHER',
  }));

  const djRows = table(section(parsed, 'DJ CUES'), [
    'Step ID',
    'Playlist',
    'Track',
    'Cutoff',
    'CutoffSec',
    'Note',
  ]);
  mergeStepRows(steps, djRows, (step, row) => {
    step.dj = {
      playlist: text(row.Playlist),
      track: text(row.Track),
      cutoff: clock(row.Cutoff),
      cutoffSec: int(row.CutoffSec),
      note: text(row.Note),
    };
  });

  const mcCues = {};
  const mcRows = table(section(parsed, 'MC CUES'), ['Step ID', 'Language', 'Timing', 'Text']);
  for (const row of mcRows) {
    const id = text(row['Step ID']);
    if (!id) continue;
    mcCues[id] = mcCues[id] ?? [];
    mcCues[id].push({
      language: text(row.Language),
      timing: text(row.Timing),
      text: text(row.Text),
    });
  }

  mergeStepRows(
    steps,
    table(section(parsed, 'SUBTASKS'), ['Step ID', 'Subtask ID', 'Label', 'Done']),
    (step, row) => {
      step.subTasks = step.subTasks ?? [];
      const label = text(row.Label);
      if (label) step.subTasks.push(label);
    },
  );

  const importantSongs = mapImportantSongs(section(parsed, 'IMPORTANT SONGS'));
  const musicSource = section(parsed, 'MUSIC POLICY');
  const musicPolicy = musicSource ? mapMusicPolicy(musicSource, importantSongs, warnings) : undefined;
  const attractionsSource = section(parsed, 'ATTRACTIONS');
  const attractions = attractionsSource ? mapAttractions(attractionsSource, warnings) : undefined;
  const guestRequests = section(parsed, 'GUEST REQUESTS');
  if (guestRequests && musicPolicy) {
    const open = bool(kv(guestRequests, 'Requests open'));
    const start = clock(kv(guestRequests, 'Window start'));
    const end = clock(kv(guestRequests, 'Window end'));
    if (open !== null) musicPolicy.requestsOpen = open;
    if (start && end) musicPolicy.requestWindow = { start, end };
  }

  const speeches = mapSpeeches(section(parsed, 'SPEECHES'));
  const cakeSource = section(parsed, 'CAKE');
  const cake = cakeSource
    ? {
        time: clock(kv(cakeSource, 'Time')),
        cuttingSong: text(kv(cakeSource, 'Cutting song')),
        sparklers: bool(kv(cakeSource, 'Sparklers')),
        photographerCue: text(kv(cakeSource, 'Photographer cue')),
        serveTime: clock(kv(cakeSource, 'Serve time')),
      }
    : undefined;

  const gamesSource = section(parsed, 'GAMES');
  const games = gamesSource ? mapGames(gamesSource) : undefined;

  // Game steps are authored as one timeline row per game. Bind each step to its
  // question list by title so the cue card and clicker stay game-specific.
  const gameLists = Array.isArray(games?.questionLists) ? games.questionLists : [];
  if (gameLists.length > 0) {
    for (const step of steps) {
      if (step?.optionalFlag !== 'games' || step.gameId) continue;
      const match = gameLists.find(
        (list) =>
          typeof list?.title === 'string' &&
          list.title.trim().toLowerCase() === String(step.title ?? '').trim().toLowerCase(),
      );
      if (match?.id) step.gameId = match.id;
    }
  }

  const preWeddingTodos = table(section(parsed, 'PRE-WEDDING TODOS'), [
    'Todo ID',
    'Task',
    'Done',
    'Due date',
    'Owner',
  ]).map((row) => ({
    task: text(row.Task) ?? row['Todo ID'],
    done: bool(row.Done, false),
  }));

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

  const mandatorySteps = mapMandatory(section(parsed, 'MANDATORY STEPS'));
  const ceremony = mapCeremony(event);
  const languagesSource = section(parsed, 'LANGUAGES');
  const kitchenSource = section(parsed, 'KITCHEN');
  const extensionSource = section(parsed, 'EXTENSIONS');
  const extensionJson = parseJsonBlock(extensionSource);
  const extensions = {
    ...(extensionJson && typeof extensionJson === 'object' ? extensionJson : {}),
    stepAnchorIds: anchorIds,
    mcCues,
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
  const liveSyncState = liveSyncSource ? mapLiveSync(liveSyncSource, steps) : undefined;

  const calculated = applyCalculatedDurations(steps, {
    closureTime: mandatorySteps.closureTime,
  });
  if (calculated.errors.length) {
    errors.push(...calculated.errors.map((message) => `TIMELINE: ${message}`));
  } else {
    steps.splice(0, steps.length, ...calculated.steps);
  }

  const cartridge = {
    schemaVersion: '1.1',
    weddingId,
    couple,
    coupleProfile: {
      bride: {
        firstName: text(kv(coupleSource, 'Bride first name')) ?? 'Bride',
        nationalities: list(kv(coupleSource, 'Bride nationality')),
      },
      groom: {
        firstName: text(kv(coupleSource, 'Groom first name')) ?? 'Groom',
        nationalities: list(kv(coupleSource, 'Groom nationality')),
      },
      commonLanguages: list(kv(coupleSource, 'Shared languages')),
    },
    date,
    syncPin,
    hostingMode: normalizeHostingMode(hostingMode),
    venue: text(kv(event, 'Venue')),
    childrenExpected: bool(kv(event, 'Children expected'), false),
    culturalRules: mapCulturalRules(
      table(section(parsed, 'CULTURAL RULES'), ['Rule', 'Status', 'Note']),
    ),
    steps,
    hardAnchors,
    venueLogistics: mapVenue(section(parsed, 'VENUE LOGISTICS')),
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
    photoPlan: mapPhotoPlan(section(parsed, 'PHOTO PLAN')),
    oczepiny: mapOczepiny(section(parsed, 'OCZEPINY')),
    speeches,
    cake,
    games,
    preWeddingTodos,
    privacy,
    mandatorySteps,
    ceremony: ceremony.type ? ceremony : undefined,
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
