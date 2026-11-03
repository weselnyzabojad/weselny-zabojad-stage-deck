// Cake protocol (project.md TODO 6) kept in sync with the DJ Key Songs card
// (TODO 18 / Phase 1.5d).
//
// `musicPolicy.importantSongs[]` is the single source of truth for the cake
// song: when a `CAKE` entry exists, its title/artist wins and `cake.cuttingSong`
// is only a legacy/display fallback. The protocol card therefore never shows a
// different song from the Key Songs card.

import { getImportantSongs } from './importantSongs.js';

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// Loose comparison so "Cake - The Coup" and "Cake — The Coup" do not look like
// a conflict, while genuinely different songs do.
export function normalizeSongLabel(value) {
  return (text(value) ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function songLabel(title, artist) {
  if (title && artist) return `${title} — ${artist}`;
  return title || artist || null;
}

export function resolveCakeProtocol(wedding, timeline = [], activeIndex = -1) {
  const cake = wedding?.cake && typeof wedding.cake === 'object' ? wedding.cake : null;
  const importantSong =
    getImportantSongs(wedding).find((song) => song?.moment === 'CAKE') ?? null;

  const title = text(importantSong?.title);
  const artist = text(importantSong?.artist);
  const syncSong = songLabel(title, artist);
  const fallbackSong = text(cake?.cuttingSong);
  const song = syncSong ?? fallbackSong;

  const time = text(cake?.time) ?? text(importantSong?.plannedTime) ?? null;
  const serveTime = text(cake?.serveTime);
  const sparklers = typeof cake?.sparklers === 'boolean' ? cake.sparklers : null;
  const photographerCue = text(cake?.photographerCue);

  const stepId = text(importantSong?.stepId);
  const entry = stepId ? timeline.find((item) => item?.step?.id === stepId) ?? null : null;
  const state = entry
    ? entry.isDone
      ? 'done'
      : entry.isActive
        ? 'active'
        : entry.index === activeIndex + 1
          ? 'next'
          : 'planned'
    : 'planned';

  const hasFields = Boolean(
    time || fallbackSong || sparklers !== null || photographerCue || serveTime,
  );

  return {
    hasData: Boolean(hasFields || importantSong),
    time,
    serveTime,
    song,
    songTitle: title,
    songArtist: artist,
    songSource: syncSong ? 'importantSongs' : fallbackSong ? 'cuttingSong' : null,
    // `cake.cuttingSong` conflicts with the CAKE key song: surface it (the UI
    // uses the Key Songs entry, never the stale copy).
    songConflict: Boolean(
      syncSong && fallbackSong && normalizeSongLabel(syncSong) !== normalizeSongLabel(fallbackSong),
    ),
    sparklers,
    photographerCue,
    stepId,
    state,
    importantSong,
    hasCakeFields: Boolean(cake),
  };
}
