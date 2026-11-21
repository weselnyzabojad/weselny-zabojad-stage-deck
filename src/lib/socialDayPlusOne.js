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

function topRequestedSong(requests = []) {
  const rows = Array.isArray(requests) ? requests : [];
  const accepted = rows.filter((row) => row?.status === 'accepted');
  const pool = accepted.length > 0 ? accepted : rows;
  const counts = new Map();
  for (const row of pool) {
    const title = typeof row?.song === 'string' ? row.song.trim() : '';
    const artist = typeof row?.artist === 'string' ? row.artist.trim() : '';
    if (!title && !artist) continue;
    const key = `${title}\u0000${artist}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const [winner] = [...counts.entries()].sort((left, right) => {
    const [leftTitle, leftArtist] = left[0].split('\u0000');
    const [rightTitle, rightArtist] = right[0].split('\u0000');
    return (
      right[1] - left[1] ||
      leftTitle.localeCompare(rightTitle) ||
      leftArtist.localeCompare(rightArtist)
    );
  });
  if (!winner) return null;
  const [title, artist] = winner[0].split('\u0000');
  return { title: title || null, artist: artist || null, count: winner[1] };
}

function recapGameSummary(recap) {
  return (Array.isArray(recap?.games) ? recap.games : []).map((game) => {
    const questions = Array.isArray(game?.questions)
      ? game.questions
      : Object.values(game?.questions ?? {});
    const measured = questions.filter(
      (question) => typeof question?.isCompatible === 'boolean',
    );
    const compatible = measured.filter((question) => question.isCompatible === true).length;
    return {
      name: game?.title ?? game?.gameId ?? null,
      compatibilityPct:
        measured.length > 0 ? Math.round((compatible / measured.length) * 100) : null,
      answered: measured.length,
    };
  });
}

export function buildDayPlusOneModel({
  wedding = null,
  liveState = null,
  recap = null,
  requests = [],
  now = new Date(),
  surface = 'mc',
} = {}) {
  const cartridge = wedding?.cartridge ?? {};
  const adminMode = surface === 'admin';
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
  const admin = adminMode
    ? {
        firstActualStart: summary.firstActualStart ?? null,
        lastActualStart: summary.lastActualStart ?? null,
        actualEnd: summary.actualEnd ?? null,
        actualDurationMinutes: number(summary.actualDurationMinutes),
        topRequest: topRequestedSong(requestRows),
        games: recapGameSummary(recap),
      }
    : null;

  return {
    unlocked: Boolean(
      eventComplete || (targetDateISO && today != null && today >= targetDateISO),
    ),
    eventComplete: Boolean(eventComplete),
    adminMode,
    admin,
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
    languages: asArray(cartridge.extensions?.languages?.hostLanguages ?? wedding?.languages),
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

export function dayPlusOneAdminCaptionLines(model, locale = 'fr') {
  const admin = model.admin;
  if (!model.adminMode || !admin) return [];
  const value = (input, suffix = '') => (input == null ? '—' : `${input}${suffix}`);
  const top = admin.topRequest
    ? [admin.topRequest.title, admin.topRequest.artist].filter(Boolean).join(' — ')
    : '—';
  const games = admin.games.length
    ? admin.games
        .map(
          (game) =>
            `${game.name ?? '—'} ${game.compatibilityPct == null ? '—' : `${game.compatibilityPct}%`} (${game.answered})`,
        )
        .join(' · ')
    : '—';
  if (locale === 'fr') {
    return [
      `Début réel : ${value(admin.firstActualStart)} · dernier départ : ${value(admin.lastActualStart)} · fin : ${value(admin.actualEnd)}`,
      `Durée réelle : ${value(admin.actualDurationMinutes, ' min')}`,
      `Titre le plus demandé : ${top}`,
      `Jeux : ${games}`,
    ];
  }
  return [
    `Rzeczywisty start: ${value(admin.firstActualStart)} · ostatni start: ${value(admin.lastActualStart)} · koniec: ${value(admin.actualEnd)}`,
    `Rzeczywisty czas: ${value(admin.actualDurationMinutes, ' min')}`,
    `Najczęściej proszona piosenka: ${top}`,
    `Gry: ${games}`,
  ];
}

export function dayPlusOneCaptionLines(model, locale = 'fr') {
  const value = (input, suffix = '') => (input == null ? '—' : `${input}${suffix}`);
  const lines =
    locale === 'fr'
      ? [
          'Le mariage est terminé — voici ce que Stage Deck a réellement exécuté.',
          `${value(model.completedSteps)}/${value(model.totalSteps)} étapes · ${value(model.onTimePct, '%')} à l’heure`,
          `${value(model.biggestDelayMinutes, ' min')} de dérive max · ${value(model.scheduleChangeCount)} changements absorbés`,
          `${value(model.requestsAccepted)} demandes acceptées · ${value(model.compatibilityPct, '%')} de compatibilité`,
        ]
      : [
          'Wesele zakończone — oto co Stage Deck naprawdę wykonał.',
          `${value(model.completedSteps)}/${value(model.totalSteps)} kroków · ${value(model.onTimePct, '%')} na czas`,
          `${value(model.biggestDelayMinutes, ' min')} maks. odchylenia · ${value(model.scheduleChangeCount)} zmian`,
          `${value(model.requestsAccepted)} przyjętych próśb · ${value(model.compatibilityPct, '%')} zgodności`,
        ];
  return [...lines, ...dayPlusOneAdminCaptionLines(model, locale)];
}
