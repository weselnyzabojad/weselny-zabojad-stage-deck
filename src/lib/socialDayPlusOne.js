// Day +1 "Post-Event Wrapped" view model (issue #1256).
//
// Existing post-event facts only: timing, drift, schedule changes, guest
// requests, games and compatibility. Curfew compliance, mic announcements and
// backstage sync counters do not exist and must never be rendered.
import { addDaysISO, resolveEventDateISO } from './eventTime.js';
import { buildTimingComparison, timingStatus } from './timingAnalytics.js';
import { resolveSocialTimeZone, venueTodayISO } from './socialDayMinusOne.js';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function number(value) {
  return Number.isFinite(value) ? value : null;
}

function percent(part, total) {
  return Number.isFinite(part) && Number.isFinite(total) && total > 0
    ? Math.round((part / total) * 100)
    : null;
}

function timingFromRecap(recap) {
  const rows = asArray(recap?.timeline).filter(
    (row) => row?.actualStart && Number.isFinite(row?.driftMinutes),
  );
  if (rows.length === 0) return { onTimePct: null, biggestDelayMinutes: null, measured: 0 };
  const onTime = rows.filter((row) => timingStatus(row.driftMinutes, true) === 'on-time').length;
  const biggest = rows.reduce(
    (value, row) => (row.driftMinutes > 0 ? Math.max(value, row.driftMinutes) : value),
    0,
  );
  return {
    onTimePct: Math.round((onTime / rows.length) * 100),
    biggestDelayMinutes: biggest,
    measured: rows.length,
  };
}

function compatibility(recap, liveState) {
  const games = asArray(recap?.games);
  const questions = games.flatMap((game) => asArray(game?.questions));
  if (questions.length > 0) {
    return {
      games: games.length,
      answered: questions.length,
      compatibilityPct: percent(
        questions.filter((question) => question.isCompatible === true).length,
        questions.length,
      ),
    };
  }
  const liveQuestions = Object.values(liveState?.game_results ?? {}).flatMap((result) =>
    Object.values(result?.questions ?? {}).filter(
      (question) => typeof question?.isCompatible === 'boolean',
    ),
  );
  return {
    games: Object.keys(liveState?.game_results ?? {}).length,
    answered: liveQuestions.length,
    compatibilityPct: percent(
      liveQuestions.filter((question) => question.isCompatible === true).length,
      liveQuestions.length,
    ),
  };
}

export function buildDayPlusOneModel({
  wedding = null,
  liveState = null,
  recap = null,
  requests = [],
  now = new Date(),
} = {}) {
  const cartridge = wedding?.cartridge ?? {};
  const eventDateISO =
    resolveEventDateISO({
      dateISO: cartridge.extensions?.dateISO ?? wedding?.dateISO,
      date: wedding?.date,
    }) ?? null;
  const timeZone = resolveSocialTimeZone(wedding);
  const targetDateISO = eventDateISO ? addDaysISO(eventDateISO, 1) : null;
  const today = venueTodayISO(timeZone, now);

  const steps = asArray(cartridge.steps);
  const liveOrder = asArray(liveState?.step_order);
  const completedIds = asArray(liveState?.completed_step_ids);
  const liveComplete =
    liveOrder.length > 0 && liveOrder.every((id) => completedIds.includes(id));
  const summary = recap?.summary ?? {};
  const recapTotal = number(summary.totalSteps);
  const recapDone = number(summary.completedSteps);
  const totalSteps = recapTotal ?? (liveOrder.length || steps.length || null);
  const completedSteps = recapDone ?? (liveOrder.length > 0 ? completedIds.length : null);
  const eventComplete =
    recapTotal != null && recapDone != null
      ? recapDone >= recapTotal
      : wedding?.eventComplete ?? liveComplete;

  const liveTiming =
    steps.length > 0
      ? buildTimingComparison(steps, liveState ?? {}, {
          closureTime:
            steps.find((step) => step?.mandatory?.kind === 'CLOSURE')?.time ?? null,
        }).summary
      : null;
  const recapTiming = timingFromRecap(recap);
  const onTimePct =
    recapTiming.measured > 0
      ? recapTiming.onTimePct
      : liveTiming && liveTiming.measured > 0
        ? Math.round((liveTiming.onTime / liveTiming.measured) * 100)
        : wedding?.onTimePct ?? null;
  const biggestDelayMinutes =
    recapTiming.measured > 0
      ? recapTiming.biggestDelayMinutes
      : wedding?.biggestDelayMinutes ?? null;

  const requestRows = asArray(requests);
  const accepted = requestRows.filter((row) => row?.status === 'accepted').length;
  const played = requestRows.filter((row) => Boolean(row?.played_at)).length;
  const games = compatibility(recap, liveState);

  return {
    unlocked: Boolean(
      eventComplete || (targetDateISO && today != null && today >= targetDateISO),
    ),
    eventComplete: Boolean(eventComplete),
    eventDateISO,
    targetDateISO,
    timeZone,
    totalSteps,
    completedSteps,
    completionPct: percent(completedSteps, totalSteps),
    onTimePct,
    biggestDelayMinutes,
    scheduleChangeCount:
      number(summary.scheduleChangeCount) ?? number(wedding?.scheduleChangeCount),
    requestsAccepted: requestRows.length > 0 ? accepted : number(wedding?.requestsAccepted),
    requestsPlayed: requestRows.length > 0 ? played : number(wedding?.requestsPlayed),
    gameCount: games.games || number(wedding?.gameCount) || null,
    compatibilityPct: games.compatibilityPct ?? number(wedding?.compatibilityPct),
    languages: asArray(cartridge.extensions?.languages?.supported ?? wedding?.languages),
    cultural: {
      stoLat:
        cartridge.culturalRules?.sto_lat?.status ??
        wedding?.details?.cultural?.stoLat ??
        null,
      gorzko:
        cartridge.culturalRules?.gorzko?.status ??
        wedding?.details?.cultural?.gorzko ??
        null,
    },
  };
}

export function dayPlusOneCaptionLines(model, locale = 'fr') {
  const value = (input, suffix = '') => (input == null ? '—' : `${input}${suffix}`);
  if (locale === 'fr') {
    return [
      'Le mariage est terminé — voici ce que Stage Deck a réellement exécuté.',
      `${value(model.completedSteps)}/${value(model.totalSteps)} étapes · ${value(model.onTimePct, '%')} à l’heure`,
      `${value(model.biggestDelayMinutes, ' min')} de dérive max · ${value(model.scheduleChangeCount)} changements absorbés`,
      `${value(model.requestsAccepted)} demandes acceptées · ${value(model.compatibilityPct, '%')} de compatibilité`,
    ];
  }
  return [
    'Wesele zakończone — oto co Stage Deck naprawdę wykonał.',
    `${value(model.completedSteps)}/${value(model.totalSteps)} kroków · ${value(model.onTimePct, '%')} na czas`,
    `${value(model.biggestDelayMinutes, ' min')} maks. odchylenia · ${value(model.scheduleChangeCount)} zmian`,
    `${value(model.requestsAccepted)} przyjętych próśb · ${value(model.compatibilityPct, '%')} zgodności`,
  ];
}
