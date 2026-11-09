// Music policy for the DJ Booth and host views (project.md TODO 2).
//
// `musicPolicy` carries the guest-facing rules: must-play, do-not-play, the
// request window, clean-version policy and licensing. `importantSongs[]` stays
// the single source of truth when a must-play entry links to a key moment by
// `id` (Phase 1.5d), so a first-dance song is never shown with two different
// titles.

import { clockToEventDate } from './eventTime.js';
import { getImportantSongs } from './importantSongs.js';

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalize(value) {
  return (text(value) ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function trackLabel(title, artist) {
  if (title && artist) return `${title} — ${artist}`;
  return title || artist || null;
}

function resolveMustPlay(policy, importantById) {
  const items = Array.isArray(policy?.mustPlay) ? policy.mustPlay : [];

  return items
    .filter((item) => item && typeof item === 'object' && text(item.track))
    .map((item, index) => {
      const id = text(item.id) ?? `must_${index + 1}`;
      const storedTrack = text(item.track);
      const linkedSong = item.id ? importantById.get(item.id) ?? null : null;
      const linkedLabel = linkedSong
        ? trackLabel(text(linkedSong.title), text(linkedSong.artist))
        : null;

      return {
        id,
        track: linkedLabel ?? storedTrack,
        storedTrack,
        note: text(item.note),
        linked: Boolean(linkedLabel),
        conflict: Boolean(
          linkedLabel && storedTrack && normalize(linkedLabel) !== normalize(storedTrack),
        ),
      };
    });
}

function resolveDoNotPlay(policy) {
  const items = Array.isArray(policy?.doNotPlay) ? policy.doNotPlay : [];

  return items
    .filter((item) => item && typeof item === 'object' && text(item.track))
    .map((item, index) => ({
      id: text(item.id) ?? `blocked_${index + 1}`,
      track: text(item.track),
      reason: text(item.reason),
    }));
}

// Returns structured status/time data only. The component renders human text
// through t() so the same state can be localized without changing the engine.
function resolveRequestStatus({ requestsOpen, start, end, now, eventDateISO, timeZone }) {
  if (requestsOpen === false) {
    return { key: 'disabled' };
  }

  if (!start || !end) {
    if (requestsOpen === true) {
      return { key: 'open', hasWindow: false };
    }
    return null;
  }

  const startAt = clockToEventDate({ clock: start, eventDateISO, timeZone });
  const endAt = clockToEventDate({ clock: end, eventDateISO, timeZone, after: startAt });
  if (!startAt || !endAt) {
    return { key: 'unknown', start, end };
  }

  if (now < startAt) {
    const toStartSec = (startAt.getTime() - now.getTime()) / 1000;
    return {
      key: 'upcoming',
      start,
      // Avoid a multi-day countdown when the cartridge is opened days early.
      countdownSec: toStartSec <= 24 * 3600 ? toStartSec : null,
    };
  }

  if (now > endAt) {
    return { key: 'closed', end };
  }

  return {
    key: 'open',
    end,
    countdownSec: (endAt.getTime() - now.getTime()) / 1000,
  };
}

function resolveMainSongs(timeline, importantSongs) {
  const entries = Array.isArray(timeline) ? timeline : [];
  const songs = Array.isArray(importantSongs) ? importantSongs : [];
  const seenSteps = new Set();

  return entries
    .map((entry) => (entry?.step && typeof entry.step === 'object' ? entry.step : entry))
    .filter((step) => step && typeof step === 'object' && step.isMainSongRequired === true)
    .filter((step) => {
      const id = text(step.id);
      if (!id || seenSteps.has(id)) return false;
      seenSteps.add(id);
      return true;
    })
    .map((step, index) => {
      const song = songs.find((candidate) => candidate?.stepId === step.id) ?? null;
      const title = text(song?.title);
      const artist = text(song?.artist);
      return {
        id: text(step.id) ?? `main_${index + 1}`,
        stepId: step.id,
        stepTitle: text(step.title) ?? text(step.id) ?? 'Main song',
        moment: song?.moment ?? null,
        title,
        artist,
        track: trackLabel(title, artist),
        missing: !title && !artist,
      };
    });
}

export function resolveMusicPolicy(
  wedding,
  now = new Date(),
  { eventDateISO = null, timeZone = 'UTC', timeline = [] } = {},
) {
  const policy = wedding?.musicPolicy && typeof wedding.musicPolicy === 'object'
    ? wedding.musicPolicy
    : null;

  const importantById = new Map(
    getImportantSongs(wedding)
      .filter((song) => typeof song?.id === 'string')
      .map((song) => [song.id, song]),
  );

  const mustPlay = resolveMustPlay(policy, importantById);
  const doNotPlay = resolveDoNotPlay(policy);
  const mainSongs = resolveMainSongs(timeline, getImportantSongs(wedding));

  const requestsOpen =
    typeof policy?.requestsOpen === 'boolean' ? policy.requestsOpen : null;
  const cleanVersions =
    typeof policy?.cleanVersions === 'boolean' ? policy.cleanVersions : null;
  const discoPoloPolicy = ['NO', 'YES', 'ON_REQUEST'].includes(policy?.discoPoloPolicy)
    ? policy.discoPoloPolicy
    : 'NO';
  const licensing = text(policy?.licensing);
  const start = text(policy?.requestWindow?.start);
  const end = text(policy?.requestWindow?.end);
  const requestWindow = start && end ? { start, end } : null;

  const requestStatus =
    policy === null
      ? null
      : resolveRequestStatus({ requestsOpen, start, end, now, eventDateISO, timeZone });

  const hasData = Boolean(
    policy &&
      (mustPlay.length ||
        doNotPlay.length ||
        requestWindow ||
        requestsOpen !== null ||
        cleanVersions !== null ||
        licensing),
  ) || mainSongs.length > 0;

  return {
    hasData,
    mustPlay,
    doNotPlay,
    mainSongs,
    requestsOpen,
    requestWindow,
    requestStatus,
    cleanVersions,
    discoPoloPolicy,
    licensing,
  };
}
