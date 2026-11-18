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

export function buildPortfolioRow({
  wedding,
  liveState = null,
  recap = null,
  requests = [],
  roles = [],
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
  const languages = Array.isArray(cartridge.extensions?.languages?.supported)
    ? cartridge.extensions.languages.supported
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
  for (const row of rows) {
    if (row.servicePackage) packages[row.servicePackage] = (packages[row.servicePackage] ?? 0) + 1;
    for (const language of row.languages) {
      languages[language] = (languages[language] ?? 0) + 1;
    }
  }
  const warnings = {};
  for (const row of qualityRows) {
    for (const warning of row.readiness) warnings[warning] = (warnings[warning] ?? 0) + 1;
  }
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
    mix: { packages, languages },
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
      now,
    }),
  );
  const filtered = applyPortfolioFilters(rows, filters);
  return {
    portfolio: buildPortfolioSummary(filtered),
    weddings: filtered,
  };
}
