// Key Songs for the DJ Booth (project.md TODO 18 / Phase 1.5d).
//
// Data lives in `musicPolicy.importantSongs[]`. The service package controls
// the depth of detail: VIP gets the source/root, cues, backup source and the
// mini QR; Standard and Solo only see title + artist. Nothing in this module
// touches the network — the QR is generated locally from the stored link.

import { defaultVipDjId, isVipDjId } from './vipDjs.js';

export const IMPORTANT_MOMENTS = {
  GRAND_ENTRANCE: { label: 'Grand entrance', icon: '🚪', order: 1 },
  CAKE: { label: 'Cake cutting', icon: '🎂', order: 2 },
  FIRST_DANCE: { label: 'First dance', icon: '💃', order: 3 },
  PARENTS_DANCE: { label: 'Parents dance', icon: '👪', order: 4 },
  LAST_DANCE: { label: 'Last dance', icon: '🌙', order: 5 },
  CUSTOM: { label: 'Key moment', icon: '⭐', order: 6 },
};

export const SOURCE_TYPES = {
  CUSTOMER_FILE: { label: 'Customer file', icon: '📁' },
  YOUTUBE: { label: 'YouTube', icon: '▶️' },
  SPOTIFY: { label: 'Spotify', icon: '🟢' },
  DEEZER: { label: 'Deezer', icon: '🎧' },
  OTHER: { label: 'Other', icon: '🔗' },
};

const STREAMING_TYPES = new Set(['YOUTUBE', 'SPOTIFY', 'DEEZER', 'OTHER']);

export const DJ_DETAIL_TIERS = {
  VIP: 'vip',
  STANDARD: 'standard',
};

// v1.1 cartridges carry `hostingMode`; v1.2 renames it to `servicePackage`.
// The v1.2 migration maps HOST_AND_DJ -> HOST_AND_DJ_VIP, HOST_ONLY -> HOST_ONLY.
export function resolveServicePackage(wedding) {
  if (typeof wedding?.servicePackage === 'string' && wedding.servicePackage) {
    return wedding.servicePackage;
  }
  if (wedding?.hostingMode === 'HOST_ONLY') return 'HOST_ONLY';
  if (wedding?.hostingMode) return 'HOST_AND_DJ_VIP';
  return 'HOST_ONLY';
}

// VIP is the only package with source/root, cues, backup source and QR.
// Standard and Solo deliberately share the title + artist detail level.
export function resolveDjIdentityId(wedding) {
  const candidate =
    wedding?.djIdentityId ?? wedding?.dj?.identityId ?? wedding?.providers?.dj?.vipDjId ?? null;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
}

// VIP is decided by the assigned DJ identity. An explicit non-VIP identity wins
// over a VIP package; with no assignment, only the VIP/MC+DJ package defaults
// to DJ Mark.
export function djDetailTier(weddingOrPackage) {
  const servicePackage =
    typeof weddingOrPackage === 'string'
      ? weddingOrPackage
      : resolveServicePackage(weddingOrPackage);
  if (typeof weddingOrPackage === 'string') {
    return servicePackage === 'HOST_AND_DJ_VIP'
      ? DJ_DETAIL_TIERS.VIP
      : DJ_DETAIL_TIERS.STANDARD;
  }

  const assigned = resolveDjIdentityId(weddingOrPackage);
  if (assigned) return isVipDjId(assigned) ? DJ_DETAIL_TIERS.VIP : DJ_DETAIL_TIERS.STANDARD;
  return defaultVipDjId(servicePackage)
    ? DJ_DETAIL_TIERS.VIP
    : DJ_DETAIL_TIERS.STANDARD;
}

export function isVipTier(tier) {
  return tier === DJ_DETAIL_TIERS.VIP;
}

export function getImportantSongs(wedding) {
  const songs = wedding?.musicPolicy?.importantSongs;
  if (!Array.isArray(songs)) return [];
  return songs.filter((song) => song && typeof song === 'object');
}

export function momentMeta(moment) {
  return IMPORTANT_MOMENTS[moment] ?? IMPORTANT_MOMENTS.CUSTOM;
}

export function sortImportantSongs(songs) {
  return [...songs].sort((a, b) => momentMeta(a.moment).order - momentMeta(b.moment).order);
}

export function sourceTypeMeta(source) {
  return SOURCE_TYPES[source?.type] ?? SOURCE_TYPES.OTHER;
}

export function sourceLabel(source) {
  if (!source || typeof source !== 'object') return '';
  const meta = sourceTypeMeta(source);
  if (source.type === 'OTHER' && typeof source.label === 'string' && source.label.trim()) {
    return `${meta.label} · ${source.label.trim()}`;
  }
  return meta.label;
}

export function isCustomerFile(source) {
  return source?.type === 'CUSTOMER_FILE';
}

export function isStreamingSource(source) {
  return Boolean(source && STREAMING_TYPES.has(source.type));
}

export function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// The exact public link for a source. `shortUrl` is an optional pre-approved,
// stable redirect so the QR stays scannable and survives link edits.
export function songLink(source) {
  if (!source) return '';
  return source.shortUrl || source.url || '';
}

// Primary-source health. Missing/unavailable sources stay editable in the
// cartridge; the card surfaces the problem instead of silently dropping it.
export function sourceStatus(source) {
  if (!source || typeof source !== 'object' || !source.type) return 'missing';

  if (isCustomerFile(source)) {
    if (source.availability === 'MISSING' || source.availability === 'UNAVAILABLE') {
      return 'unavailable';
    }
    if (!source.fileRef && !isHttpUrl(source.url)) return 'missing';
    return 'ready';
  }

  if (!songLink(source)) return 'missing';
  return isHttpUrl(songLink(source)) ? 'ready' : 'unavailable';
}

export function songStatus(song) {
  const primary = sourceStatus(song?.source);
  if (primary === 'ready') return 'ready';
  if (sourceStatus(song?.backupSource) === 'ready') return 'backup';
  return primary === 'unavailable' ? 'unavailable' : 'missing';
}

// QR target rules (Phase 1.5d):
// - Streaming sources encode the exact customer URL (or the stable shortUrl).
// - A customer file is encoded only when it has a stable, intentionally shared
//   HTTPS URL. Protected files (fileRef only) never expose a URL, token or
//   signed link in a QR.
export function qrTarget(song) {
  const source = song?.source;
  if (!source || typeof source !== 'object') {
    return { unavailable: 'No source set for this song.' };
  }

  if (isCustomerFile(source)) {
    if (isHttpUrl(source.url)) return { url: source.url };
    return { unavailable: 'QR unavailable for protected file — use Open file.' };
  }

  const link = songLink(source);
  if (isHttpUrl(link)) return { url: link };
  return { unavailable: 'No public link to encode.' };
}

export function formatCueSeconds(value) {
  if (!Number.isFinite(value) || value < 0) return null;
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Ready/next state, linked to the projected timeline through `stepId`.
export function songState(song, timeline = [], activeIndex = -1) {
  if (!song?.stepId) return 'planned';
  const entry = timeline.find((item) => item?.step?.id === song.stepId);
  if (!entry) return 'planned';
  if (entry.isDone) return 'done';
  if (entry.isActive) return 'active';
  if (entry.index === activeIndex + 1) return 'next';
  return 'planned';
}
