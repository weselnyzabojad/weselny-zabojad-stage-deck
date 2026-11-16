// Post-wedding recap contract and redaction layer (issue #1135).
//
// The recap is built only from the published cartridge, live state and the
// public song-request rows. It is an allowlist: every field is copied
// explicitly, so internal notes, contacts, tokens, device ids, raw mutation
// payloads and speech/music internals never reach the couple-facing payload.

import { buildTimeline } from './driftEngine.js';
import { resolveEventDateISO, resolveVenueTimeZone } from './eventTime.js';
import { resolveMusicPolicy } from './musicPolicy.js';

export const RECAP_SCHEMA_VERSION = 1;

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function finiteNumber(value) {
  return Number.isFinite(value) ? value : null;
}

function firstText(...values) {
  for (const value of values) {
    const result = text(value);
    if (result) return result;
  }
  return null;
}

function minutesBetween(startIso, endIso) {
  const start = Date.parse(startIso ?? '');
  const end = Date.parse(endIso ?? '');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / 60000);
}

function coupleLabel(wedding) {
  const bride = firstText(wedding?.coupleProfile?.bride?.firstName);
  const groom = firstText(wedding?.coupleProfile?.groom?.firstName);
  if (bride && groom) return `${bride} & ${groom}`;
  return bride || groom || text(wedding?.couple) || null;
}

function venueName(wedding) {
  return firstText(
    wedding?.venueDetails?.name,
    wedding?.venue?.name,
    wedding?.venueName,
  );
}

function timelineEntry(entry, nextEntry) {
  const step = entry?.step ?? {};
  const actualStart = entry?.actualStart ?? null;
  const actualEnd = nextEntry?.actualStart ?? null;
  return {
    id: text(step.id),
    title: text(step.title) ?? text(step.id),
    type: text(step.type),
    location: text(step.location),
    plannedStart: entry?.plannedStart ?? null,
    plannedEnd: entry?.plannedEnd ?? null,
    actualStart,
    actualEnd,
    actualTimestamp: entry?.actualTimestamp ?? null,
    durationMin: finiteNumber(entry?.durationMin),
    driftMinutes: finiteNumber(entry?.actualDriftMinutes ?? entry?.driftMinutes),
    status: entry?.isDone ? 'done' : entry?.isActive ? 'active' : 'upcoming',
  };
}

function buildChanges(liveState) {
  const log = Array.isArray(liveState?.mutation_log) ? liveState.mutation_log : [];
  return log
    .filter(
      (entry) =>
        entry?.op === 'schedule_change' &&
        entry?.payload?.change?.kind === 'reschedule',
    )
    .map((entry) => {
      const change = entry.payload.change;
      return {
        at: text(entry.timestamp),
        stepId: text(change.stepId),
        stepTitle: text(change.stepTitle) ?? text(change.stepId),
        from: text(change.from),
        to: text(change.to),
        authorRole: text(change.authorRole) ?? text(entry.role),
      };
    })
    .filter((change) => change.at && change.stepTitle)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

function buildGames(steps, liveState) {
  const results =
    liveState?.game_results && typeof liveState.game_results === 'object'
      ? liveState.game_results
      : {};
  return Object.entries(results)
    .map(([gameId, result]) => {
      const step = steps.find((candidate) => candidate?.game?.id === gameId) ?? null;
      return {
        gameId,
        title: firstText(step?.game?.title, step?.title, gameId),
        stepTitle: text(step?.title),
        startedAt: text(result?.startedAt),
        completedAt: text(result?.completedAt),
        totalQuestions: finiteNumber(result?.totalQuestions),
        answeredCount: finiteNumber(result?.answeredCount),
        score: finiteNumber(result?.score),
      };
    })
    .filter((game) => game.title);
}

function buildCeremony(steps) {
  const parts = [];
  for (const step of steps) {
    const subSteps = Array.isArray(step?.ceremony?.subSteps)
      ? step.ceremony.subSteps
      : [];
    for (const part of subSteps) {
      if (!part || typeof part !== 'object') continue;
      const title = text(part.title);
      if (!title) continue;
      parts.push({
        stepId: text(step.id),
        stepTitle: text(step.title),
        id: text(part.id),
        time: text(part.time),
        title,
        musicCue: text(part.musicCue),
        responsibleRole: text(part.responsibleRole),
      });
    }
  }
  return parts;
}

function buildVendors(wedding) {
  const mediaTeam = Array.isArray(wedding?.mediaTeam) ? wedding.mediaTeam : [];
  const musicians = Array.isArray(wedding?.musicians?.items)
    ? wedding.musicians.items
    : [];
  return {
    mediaTeam: mediaTeam
      .filter((member) => member && typeof member === 'object')
      .map((member) => ({
        role: text(member.role),
        name: text(member.name),
        startTime: text(member.startTime),
        endTime: text(member.endTime),
      }))
      .filter((member) => member.role || member.name),
    musicians: musicians
      .filter((musician) => musician?.active !== false)
      .map((musician) => ({
        name: text(musician.name),
        instrument: text(musician.instrument),
        startTime: text(musician.startTime),
        endTime: text(musician.endTime),
        ceremonyRequired: musician.ceremonyRequired === true,
      }))
      .filter((musician) => musician.name),
  };
}

function buildMusic(wedding, generatedAt, timeline) {
  const policy = resolveMusicPolicy(wedding, generatedAt, {
    eventDateISO: resolveEventDateISO(wedding),
    timeZone: resolveVenueTimeZone(wedding),
    timeline,
  });
  return {
    discoPoloPolicy: policy.discoPoloPolicy,
    mainSongs: (policy.mainSongs ?? []).map((song) => ({
      stepTitle: song.stepTitle,
      title: song.title,
      artist: song.artist,
      missing: song.missing === true,
    })),
    mustPlay: (policy.mustPlay ?? []).map((song) => ({ track: song.track })),
    doNotPlay: (policy.doNotPlay ?? []).map((song) => ({ track: song.track })),
  };
}

function songRequestRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      song: text(row?.song ?? row?.title),
      artist: text(row?.artist),
      createdAt: text(row?.created_at ?? row?.createdAt),
    }))
    .filter((row) => row.song || row.artist);
}

export function buildWeddingRecap({
  wedding,
  liveState = {},
  songRequests = [],
  generatedAt = new Date(),
} = {}) {
  if (!wedding || typeof wedding !== 'object' || Array.isArray(wedding)) {
    throw new TypeError('buildWeddingRecap requires a wedding object.');
  }

  const steps = (Array.isArray(wedding.steps) ? wedding.steps : []).filter(
    (step) => step && typeof step === 'object',
  );
  const eventDateISO = resolveEventDateISO(wedding);
  const timeZone = resolveVenueTimeZone(wedding);
  const entries = buildTimeline(steps, liveState, {
    eventContext: { eventDateISO, timeZone },
  });
  const timeline = entries.map((entry, index) =>
    timelineEntry(entry, entries[index + 1] ?? null),
  );
  const actualEntries = timeline.filter((entry) => entry.actualStart);
  const firstActual = actualEntries[0] ?? null;
  const lastActual = actualEntries[actualEntries.length - 1] ?? null;
  const drifts = timeline
    .map((entry) => entry.driftMinutes)
    .filter((value) => Number.isFinite(value));
  const changes = buildChanges(liveState);
  const games = buildGames(steps, liveState);
  const ceremony = buildCeremony(steps);
  const vendors = buildVendors(wedding);
  const music = buildMusic(wedding, generatedAt, entries);
  const guestRequests = songRequestRows(songRequests);

  const generatedIso =
    generatedAt instanceof Date && Number.isFinite(generatedAt.getTime())
      ? generatedAt.toISOString()
      : new Date().toISOString();

  return {
    schemaVersion: RECAP_SCHEMA_VERSION,
    generatedAt: generatedIso,
    wedding: {
      id: text(wedding.weddingId),
      couple: coupleLabel(wedding),
      date: text(wedding.date),
      dateISO: eventDateISO,
      venue: venueName(wedding),
    },
    summary: {
      plannedStart: timeline[0]?.plannedStart ?? null,
      plannedEnd: timeline[timeline.length - 1]?.plannedEnd ?? null,
      firstActualStart: firstActual?.actualStart ?? null,
      lastActualStart: lastActual?.actualStart ?? null,
      actualDurationMinutes: firstActual && lastActual
        ? minutesBetween(firstActual.actualTimestamp, lastActual.actualTimestamp)
        : null,
      totalSteps: timeline.length,
      completedSteps: timeline.filter((entry) => entry.status === 'done').length,
      totalDriftMinutes: drifts.reduce((sum, value) => sum + Math.abs(value), 0),
      biggestDelayMinutes: drifts.length > 0 ? Math.max(0, ...drifts) : 0,
      scheduleChangeCount: changes.length,
      songRequestCount: guestRequests.length,
      gameCount: games.length,
      ceremonyPartCount: ceremony.length,
    },
    timeline,
    changes,
    music: {
      ...music,
      guestRequests,
    },
    games,
    ceremony,
    vendors,
  };
}

export default buildWeddingRecap;
