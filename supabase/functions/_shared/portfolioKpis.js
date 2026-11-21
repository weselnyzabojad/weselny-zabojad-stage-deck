// Owner portfolio KPI aggregation (issue #1210).
// Pure helper: the admin_api action only loads rows and passes them here.

import { buildTimingComparison, timingStatus } from './timingAnalytics.js';

const ARCHIVED = 'archived';
const ACTIVE = 'active';
const EXPIRED = 'expired';

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function number(value) {
  return Number.isFinite(value) ? value : null;
}

function ratio(part, total) {
  return Number.isFinite(part) && Number.isFinite(total) && total > 0
    ? Math.round((part / total) * 100)
    : null;
}

function average(values) {
  const list = values.filter((value) => Number.isFinite(value));
  return list.length > 0 ? Math.round(list.reduce((sum, value) => sum + value, 0) / list.length) : null;
}

function median(values) {
  const list = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (list.length === 0) return null;
  const middle = Math.floor(list.length / 2);
  return list.length % 2 === 0
    ? Math.round((list[middle - 1] + list[middle]) / 2)
    : list[middle];
}

function dateISO(cartridge, date) {
  const canonical = text(cartridge?.extensions?.dateISO);
  if (/^\d{4}-\d{2}-\d{2}$/.test(canonical ?? '')) return canonical;
  const match = /^([0-3]\d)\.([01]\d)\.(\d{4})$/.exec(text(date) ?? '');
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

export function resolvePortfolioStatus(wedding, now = new Date()) {
  if (wedding?.archived_at) return ARCHIVED;
  const expiresAt = Date.parse(wedding?.expires_at ?? '');
  if (Number.isFinite(expiresAt) && expiresAt <= now.getTime()) return EXPIRED;
  return ACTIVE;
}

function liveCompleted(liveState) {
  const order = Array.isArray(liveState?.step_order) ? liveState.step_order : [];
  const completed = Array.isArray(liveState?.completed_step_ids)
    ? liveState.completed_step_ids
    : [];
  return {
    total: order.length,
    done: order.filter((id) => completed.includes(id)).length,
    eventComplete:
      liveState?.active_step_id == null &&
      order.length > 0 &&
      order.every((id) => completed.includes(id)),
  };
}

function timingFromLive(steps, liveState) {
  const list = Array.isArray(steps) ? steps : [];
  const { rows, summary } = buildTimingComparison(list, liveState ?? {}, {
    closureTime: list.find((step) => step?.mandatory?.kind === 'CLOSURE')?.time ?? null,
  });
  const biggestDelay = rows.reduce(
    (value, row) => (row.deltaMinutes > 0 ? Math.max(value, row.deltaMinutes) : value),
    0,
  );
  return {
    onTimePct:
      summary.measured > 0 ? Math.round((summary.onTime / summary.measured) * 100) : null,
    biggestDelayMinutes: summary.measured > 0 ? biggestDelay : null,
  };
}

function timingFromRecap(recap) {
  const rows = Array.isArray(recap?.timeline) ? recap.timeline : [];
  const measured = rows.filter(
    (row) => row?.actualStart && Number.isFinite(row?.driftMinutes),
  );
  const onTime = measured.filter(
    (row) => timingStatus(row.driftMinutes, true) === 'on-time',
  ).length;
  const biggestDelay = measured.reduce(
    (value, row) => (row.driftMinutes > 0 ? Math.max(value, row.driftMinutes) : value),
    0,
  );
  return {
    onTimePct: measured.length > 0 ? Math.round((onTime / measured.length) * 100) : null,
    biggestDelayMinutes: measured.length > 0 ? biggestDelay : null,
  };
}

function compatibility(recap, liveState) {
  const games = Array.isArray(recap?.games) ? recap.games : [];
  const questions = games.flatMap((game) => (Array.isArray(game?.questions) ? game.questions : []));
  if (questions.length > 0) {
    const compatible = questions.filter((question) => question.isCompatible === true).length;
    return {
      gameCount: games.length,
      compatibilityPct: Math.round((compatible / questions.length) * 100),
      answered: questions.length,
    };
  }
  const liveGames = liveState?.game_results ?? {};
  const liveQuestions = Object.values(liveGames).flatMap((result) =>
    Object.values(result?.questions ?? {}).filter(
      (question) => typeof question?.isCompatible === 'boolean',
    ),
  );
  return {
    gameCount: Object.keys(liveGames).length,
    compatibilityPct:
      liveQuestions.length > 0
        ? Math.round(
            (liveQuestions.filter((question) => question.isCompatible === true).length /
              liveQuestions.length) *
              100,
          )
        : null,
    answered: liveQuestions.length,
  };
}

function asRecapPayload(recap) {
  if (!recap) return null;
  return recap.payload && typeof recap.payload === 'object' ? recap.payload : recap;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim()))];
}

function countBy(values) {
  const counts = {};
  for (const value of values) {
    if (!value) continue;
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

export function buildPortfolioRow({
  wedding,
  liveState = null,
  recap = null,
  requests = [],
  roles = [],
  providers = [],
  musicians = [],
  speeches = [],
  gameBundles = [],
  receipts = [],
  sessions = [],
  presence = [],
  cartridgeRevision = null,
  now = new Date(),
} = {}) {
  const cartridge = wedding?.cartridge ?? {};
  const payload = asRecapPayload(recap);
  const steps = Array.isArray(cartridge.steps) ? cartridge.steps : [];
  const live = liveState ? liveCompleted(liveState) : null;
  const summary = payload?.summary ?? {};
  const recapTotal = number(summary.totalSteps);
  const recapDone = number(summary.completedSteps);
  const totalSteps = recapTotal ?? live?.total ?? steps.length;
  const completedSteps = recapDone ?? live?.done ?? null;
  const timing = payload?.timeline?.length
    ? timingFromRecap(payload)
    : timingFromLive(steps, liveState);
  const games = compatibility(payload, liveState);
  const requestRows = Array.isArray(requests) ? requests : [];
  const accepted = requestRows.filter((row) => row?.status === 'accepted').length;
  const played = requestRows.filter((row) => Boolean(row?.played_at)).length;
  const languages = Array.isArray(cartridge.extensions?.languages?.hostLanguages)
    ? cartridge.extensions.languages.hostLanguages
    : [];
  const date = dateISO(cartridge, wedding?.date);
  const status = resolvePortfolioStatus(wedding, now);
  const eventComplete =
    recapTotal != null && recapDone != null
      ? recapDone >= recapTotal
      : live?.eventComplete ?? false;
  const readiness = [];
  if (languages.length === 0) readiness.push('missing_languages');
  if (steps.length === 0) readiness.push('missing_steps');
  if (!payload) readiness.push('recap_not_published');
  if (timing.onTimePct == null) readiness.push('missing_actuals');

  const coupleProfile = cartridge.coupleProfile ?? {};
  const demographics = cartridge.demographics ?? {};
  const culturalRules = cartridge.culturalRules ?? {};
  const musicPolicy = cartridge.musicPolicy ?? {};
  const providerRows = asArray(providers);
  const musicianRows = asArray(musicians);
  const speechRows = asArray(speeches);
  const bundleRows = asArray(gameBundles);
  const witnessRows = asArray(cartridge.witnesses);
  const speechPlan = asArray(cartridge.speeches);
  const ceremonySteps = steps.filter((step) => step?.type === 'CEREMONY');
  const hardAnchors = asArray(cartridge.hardAnchors);
  const stepTypes = unique(steps.map((step) => text(step?.type)));
  const locations = unique(steps.map((step) => text(step?.location)));
  const importantSongs = asArray(musicPolicy.importantSongs);
  const requestWindow = musicPolicy.requestWindow ?? null;
  const activeProviders = providerRows.filter((row) => row?.active !== false);
  const providerCategories = unique(providerRows.map((row) => text(row?.category)));
  const activeMusicians = musicianRows.filter((row) => row?.active !== false);
  const publishedBundles = bundleRows.filter((row) => !row?.status || row.status === 'PUBLISHED');
  const compatibilityQuestions = publishedBundles.reduce(
    (sum, row) => sum + (number(row?.question_count) ?? 0),
    0,
  );
  const venue = {
    name: text(wedding?.venue_name) ?? text(cartridge.venueDetails?.venue),
    city: text(wedding?.venue_city),
    country: text(wedding?.venue_country),
  };
  const guestCounts = {
    total: number(demographics.total),
    pl: number(demographics.pl),
    fr: number(demographics.fr),
    other: number(demographics.other),
  };
  const cultural = {
    stoLat: text(culturalRules?.sto_lat?.status),
    gorzko: text(culturalRules?.gorzko?.status),
    breadSalt: text(culturalRules?.bread_salt?.status),
  };
  const photo = {
    groupPhotos: asArray(cartridge.groupPhotos?.groups).length,
    miniSession: Boolean(cartridge.miniSession?.enabled),
    attractions: asArray(cartridge.attractions).length,
    cake: Boolean(cartridge.cake?.time),
    firstDance: asArray(cartridge.firstDance).length,
    specialEffects: asArray(cartridge.specialEffects).length,
    photoPlanSections: asArray(cartridge.photoPlan?.sections).length,
  };
  const team = {
    sessions: asArray(sessions).filter((row) => !row?.revoked_at).length,
    presence: asArray(presence).filter((row) => row?.status === 'online').length,
    receipts: asArray(receipts).length,
  };
  const rawPolicy = liveState?.media_overrides?.venuePolicies ?? null;
  const venuePolicy = {
    decibelLimitEnabled: rawPolicy?.decibelLimitEnabled === true,
    decibelLimit:
      Number.isFinite(rawPolicy?.decibelLimit) && rawPolicy.decibelLimit > 0
        ? Math.round(rawPolicy.decibelLimit)
        : null,
    forbiddenFx: Array.isArray(rawPolicy?.forbiddenFx)
      ? rawPolicy.forbiddenFx.filter(Boolean)
      : [],
  };

  return {
    id: text(wedding?.wedding_id),
    couple: text(wedding?.couple),
    date: text(wedding?.date),
    dateISO: date,
    status,
    archived: status === ARCHIVED,
    expired: status === EXPIRED,
    upcoming: date != null ? date >= now.toISOString().slice(0, 10) : false,
    eventComplete,
    servicePackage: text(cartridge.servicePackage),
    languages,
    roles: Array.isArray(roles) ? roles.filter(Boolean) : [],
    lastActivity: text(wedding?.updated_at),
    totalSteps,
    completedSteps,
    completionPct: ratio(completedSteps, totalSteps),
    onTimePct: timing.onTimePct,
    biggestDelayMinutes: timing.biggestDelayMinutes,
    scheduleChangeCount: number(summary.scheduleChangeCount),
    requestsTotal: requestRows.length,
    requestsAccepted: accepted,
    requestsPlayed: played,
    gameCount: games.gameCount,
    compatibilityPct: games.compatibilityPct,
    recapPublished: payload != null,
    dataQuality: payload ? 'recap' : liveState ? 'live' : 'none',
    readiness,
    guestsTotal: guestCounts.total,
    guestsPl: guestCounts.pl,
    guestsFr: guestCounts.fr,
    guestsOther: guestCounts.other,
    country: venue.country,
    city: venue.city,
    venueName: venue.name,
    providerCount: providerRows.length,
    activeProviderCount: activeProviders.length,
    musicianCount: musicianRows.length,
    activeMusicianCount: activeMusicians.length,
    speechCount: speechPlan.length,
    speechRecordCount: speechRows.length,
    witnessCount: witnessRows.length,
    questionCount: compatibilityQuestions,
    gameBundleCount: publishedBundles.length,
    songCount: importantSongs.length + asArray(musicPolicy.mustPlay).length,
    doNotPlayCount: asArray(musicPolicy.doNotPlay).length,
    keyMomentCount: importantSongs.length,
    hardAnchorCount: hardAnchors.length,
    ceremonyPartCount: ceremonySteps.length,
    attractionCount: photo.attractions,
    cartridgeRevision: number(cartridgeRevision) ?? number(wedding?.cartridge_revision),
    actualEnd: text(summary.actualEnd),
    actualDurationMinutes: number(summary.actualDurationMinutes),
    venuePolicy,
    details: {
      couple: {
        brideFirstName: text(coupleProfile?.bride?.firstName),
        brideNationalities: asArray(coupleProfile?.bride?.nationalities),
        groomFirstName: text(coupleProfile?.groom?.firstName),
        groomNationalities: asArray(coupleProfile?.groom?.nationalities),
        commonLanguages: asArray(coupleProfile?.commonLanguages),
      },
      demographics: guestCounts,
      venue,
      cultural,
      package: {
        servicePackage: text(cartridge.servicePackage),
        languages,
      },
      providers: {
        total: providerRows.length,
        active: activeProviders.length,
        categories: countBy(providerCategories),
      },
      musicians: {
        total: musicianRows.length,
        active: activeMusicians.length,
        ceremonyRequired: musicianRows.filter((row) => row?.ceremony_required === true).length,
      },
      timeline: {
        steps: steps.length,
        hardAnchors: hardAnchors.length,
        types: countBy(stepTypes),
        locations: locations.length,
        scheduleChanges: number(summary.scheduleChangeCount),
        actualEnd: text(summary.actualEnd),
        actualDurationMinutes: number(summary.actualDurationMinutes),
      },
      music: {
        importantSongs: importantSongs.length,
        mustPlay: asArray(musicPolicy.mustPlay).length,
        doNotPlay: asArray(musicPolicy.doNotPlay).length,
        discoPolo: text(musicPolicy.discoPoloPolicy),
        requestsOpen: typeof musicPolicy.requestsOpen === 'boolean' ? musicPolicy.requestsOpen : null,
        requestWindow: requestWindow
          ? { start: text(requestWindow.start), end: text(requestWindow.end) }
          : null,
        guestRequests: requestRows.length,
      },
      speeches: {
        planned: speechPlan.length,
        records: speechRows.length,
        witnesses: witnessRows.length,
        ceremonyParts: ceremonySteps.length,
        languages: unique(speechRows.map((row) => text(row?.speaker_language))),
      },
      games: {
        games: games.gameCount,
        answers: games.answered ?? null,
        compatibilityPct: games.compatibilityPct,
        bundles: publishedBundles.length,
        questions: compatibilityQuestions,
      },
      photo,
      oczepiny: asArray(cartridge.oczepiny?.subEvents).length,
      team,
      cover: {
        hasDemographics: guestCounts.total != null,
        hasVenue: Boolean(venue.country || venue.city || venue.name),
        hasProviders: providerRows.length > 0,
        hasMusicians: musicianRows.length > 0,
        hasSpeeches: speechPlan.length > 0 || speechRows.length > 0,
        hasGames: games.gameCount > 0 || bundleRows.length > 0,
        hasMusicPolicy: Boolean(musicPolicy.discoPoloPolicy || importantSongs.length),
        hasPhotoPlan: photo.groupPhotos > 0 || photo.miniSession || photo.attractions > 0,
      },
    },
  };
}

export function applyPortfolioFilters(rows, filters = {}) {
  return rows.filter((row) => {
    if (filters.year && row.dateISO?.slice(0, 4) !== String(filters.year)) return false;
    if (filters.status === 'active' && row.status !== ACTIVE) return false;
    if (filters.status === 'archived' && row.status !== ARCHIVED) return false;
    if (filters.package && row.servicePackage !== filters.package) return false;
    if (filters.language && !row.languages.includes(String(filters.language).toUpperCase())) {
      return false;
    }
    if (filters.country && row.country !== String(filters.country).toUpperCase()) return false;
    if (filters.provider && !row.details.providers.categories[filters.provider]) return false;
    return true;
  });
}

export function buildPortfolioSummary(rows) {
  const qualityRows = rows.filter((row) => row.status === ACTIVE);
  const requestTotal = qualityRows.reduce((sum, row) => sum + (row.requestsTotal ?? 0), 0);
  const requestAccepted = qualityRows.reduce((sum, row) => sum + (row.requestsAccepted ?? 0), 0);
  const requestPlayed = qualityRows.reduce((sum, row) => sum + (row.requestsPlayed ?? 0), 0);
  const packages = {};
  const languages = {};
  const countries = {};
  const nationalities = {};
  const cultures = { stoLat: 0, gorzko: 0, breadSalt: 0 };
  const providerCategories = {};
  const discoPolo = {};
  for (const row of rows) {
    if (row.servicePackage) packages[row.servicePackage] = (packages[row.servicePackage] ?? 0) + 1;
    for (const language of row.languages) {
      languages[language] = (languages[language] ?? 0) + 1;
    }
    if (row.country) countries[row.country] = (countries[row.country] ?? 0) + 1;
    for (const nationality of [
      ...row.details.couple.brideNationalities,
      ...row.details.couple.groomNationalities,
    ]) {
      nationalities[nationality] = (nationalities[nationality] ?? 0) + 1;
    }
    for (const key of Object.keys(cultures)) {
      if (row.details.cultural[key] === 'YES' || row.details.cultural[key] === 'ON_REQUEST') {
        cultures[key] += 1;
      }
    }
    for (const [category, count] of Object.entries(row.details.providers.categories)) {
      providerCategories[category] = (providerCategories[category] ?? 0) + count;
    }
    if (row.details.music.discoPolo) {
      discoPolo[row.details.music.discoPolo] =
        (discoPolo[row.details.music.discoPolo] ?? 0) + 1;
    }
  }
  const warnings = {};
  for (const row of qualityRows) {
    for (const warning of row.readiness) warnings[warning] = (warnings[warning] ?? 0) + 1;
  }
  const guestCount = (key) =>
    qualityRows.reduce((sum, row) => sum + (row[`guests${key}`] ?? 0), 0);
  return {
    totals: {
      all: rows.length,
      active: rows.filter((row) => row.status === ACTIVE).length,
      archived: rows.filter((row) => row.status === ARCHIVED).length,
      expired: rows.filter((row) => row.status === EXPIRED).length,
      upcoming: qualityRows.filter((row) => row.upcoming).length,
      completed: rows.filter((row) => row.eventComplete).length,
      liveNow: qualityRows.filter((row) => row.dataQuality === 'live').length,
    },
    mix: { packages, languages, countries, nationalities, cultures, discoPolo },
    providerCategories,
    guests: {
      total: guestCount('Total'),
      pl: guestCount('Pl'),
      fr: guestCount('Fr'),
      other: guestCount('Other'),
      weddingsWithGuests: qualityRows.filter((row) => row.guestsTotal != null).length,
    },
    team: {
      providers: qualityRows.reduce((sum, row) => sum + (row.providerCount ?? 0), 0),
      activeProviders: qualityRows.reduce((sum, row) => sum + (row.activeProviderCount ?? 0), 0),
      musicians: qualityRows.reduce((sum, row) => sum + (row.musicianCount ?? 0), 0),
      witnesses: qualityRows.reduce((sum, row) => sum + (row.witnessCount ?? 0), 0),
      speeches: qualityRows.reduce((sum, row) => sum + (row.speechCount ?? 0), 0),
    },
    music: {
      songs: qualityRows.reduce((sum, row) => sum + (row.songCount ?? 0), 0),
      doNotPlay: qualityRows.reduce((sum, row) => sum + (row.doNotPlayCount ?? 0), 0),
      requests: requestTotal,
      accepted: requestAccepted,
      played: requestPlayed,
    },
    interactions: {
      games: qualityRows.reduce((sum, row) => sum + (row.gameCount ?? 0), 0),
      questions: qualityRows.reduce((sum, row) => sum + (row.questionCount ?? 0), 0),
      compatibilityAveragePct: average(qualityRows.map((row) => row.compatibilityPct)),
    },
    photo: {
      groupPhotoSets: qualityRows.reduce((sum, row) => sum + (row.details.photo.groupPhotos ?? 0), 0),
      attractions: qualityRows.reduce((sum, row) => sum + (row.details.photo.attractions ?? 0), 0),
      miniSessions: qualityRows.filter((row) => row.details.photo.miniSession).length,
      firstDanceSets: qualityRows.reduce((sum, row) => sum + (row.details.photo.firstDance ?? 0), 0),
      specialEffects: qualityRows.reduce((sum, row) => sum + (row.details.photo.specialEffects ?? 0), 0),
      cakeConfigured: qualityRows.filter((row) => row.details.photo.cake).length,
    },
    recapPublicationRate: ratio(
      qualityRows.filter((row) => row.recapPublished).length,
      qualityRows.length,
    ),
    averageCompletionPct: average(qualityRows.map((row) => row.completionPct)),
    averageOnTimePct: average(qualityRows.map((row) => row.onTimePct)),
    medianDelayMinutes: median(qualityRows.map((row) => row.biggestDelayMinutes)),
    biggestDelayMinutes: qualityRows.reduce(
      (value, row) => Math.max(value, row.biggestDelayMinutes ?? 0),
      0,
    ),
    requestAcceptanceRate: ratio(requestAccepted, requestTotal),
    requestPlayedRate: ratio(requestPlayed, requestTotal),
    gamesPlayedPct: ratio(qualityRows.filter((row) => row.gameCount > 0).length, qualityRows.length),
    averageCompatibilityPct: average(qualityRows.map((row) => row.compatibilityPct)),
    coverage: {
      filters: rows.length,
      quality: qualityRows.length,
      withRecap: rows.filter((row) => row.dataQuality === 'recap').length,
      withLive: rows.filter((row) => row.dataQuality === 'live').length,
      withTiming: qualityRows.filter((row) => row.onTimePct != null).length,
      withRequests: qualityRows.filter((row) => row.requestsTotal > 0).length,
      withCompatibility: qualityRows.filter((row) => row.compatibilityPct != null).length,
      withGuests: qualityRows.filter((row) => row.guestsTotal != null).length,
      withVenue: qualityRows.filter((row) => row.details.cover.hasVenue).length,
      withProviders: qualityRows.filter((row) => row.details.cover.hasProviders).length,
      withMusicians: qualityRows.filter((row) => row.details.cover.hasMusicians).length,
      withSpeeches: qualityRows.filter((row) => row.details.cover.hasSpeeches).length,
      withGames: qualityRows.filter((row) => row.details.cover.hasGames).length,
      withMusicPolicy: qualityRows.filter((row) => row.details.cover.hasMusicPolicy).length,
      withPhotoPlan: qualityRows.filter((row) => row.details.cover.hasPhotoPlan).length,
    },
    readiness: warnings,
  };
}

export function buildPortfolioKpis({
  weddings = [],
  liveStates = {},
  recaps = {},
  requests = {},
  roles = {},
  providers = {},
  musicians = {},
  speeches = {},
  gameBundles = {},
  receipts = {},
  sessions = {},
  presence = {},
  cartridgeRevisions = {},
  filters = {},
  now = new Date(),
} = {}) {
  const rows = weddings.map((wedding) =>
    buildPortfolioRow({
      wedding,
      liveState: liveStates[wedding.wedding_id] ?? null,
      recap: recaps[wedding.wedding_id] ?? null,
      requests: requests[wedding.wedding_id] ?? [],
      roles: roles[wedding.wedding_id] ?? [],
      providers: providers[wedding.wedding_id] ?? [],
      musicians: musicians[wedding.wedding_id] ?? [],
      speeches: speeches[wedding.wedding_id] ?? [],
      gameBundles: gameBundles[wedding.wedding_id] ?? [],
      receipts: receipts[wedding.wedding_id] ?? [],
      sessions: sessions[wedding.wedding_id] ?? [],
      presence: presence[wedding.wedding_id] ?? [],
      cartridgeRevision: cartridgeRevisions[wedding.wedding_id] ?? null,
      now,
    }),
  );
  const filtered = applyPortfolioFilters(rows, filters);
  return {
    portfolio: buildPortfolioSummary(filtered),
    weddings: filtered,
  };
}
