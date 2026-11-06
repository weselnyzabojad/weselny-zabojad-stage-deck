import { songCues } from './importantSongs.js';

function entryTrack(entry) {
  if (!entry?.step) return null;
  return entry.step.dj?.track ?? entry.step.title ?? null;
}

export function resolveNowPlaying({ activeEntry = null, nextEntry = null, keySongs = [] } = {}) {
  const activeSong = activeEntry
    ? keySongs.find((song) => song?.stepId === activeEntry.step?.id)
    : null;

  return {
    stepTitle: activeEntry?.step?.title ?? null,
    title: activeSong?.title || entryTrack(activeEntry),
    artist: activeSong?.artist ?? null,
    track: activeEntry?.step?.dj?.track ?? null,
    cues: activeSong ? songCues(activeSong) : [],
    plannedTime: activeSong?.plannedTime ?? activeEntry?.projectedStart ?? null,
    cutoff:
      activeEntry?.step?.dj?.cutoff ??
      (Number.isFinite(activeEntry?.step?.dj?.cutoffSec)
        ? `start + ${activeEntry.step.dj.cutoffSec}s`
        : null),
    nextTitle: entryTrack(nextEntry),
    nextStepTitle: nextEntry?.step?.title ?? null,
    nextStart: nextEntry?.projectedStart ?? null,
  };
}
