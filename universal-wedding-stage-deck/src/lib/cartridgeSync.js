// Pure revision and sync-status helpers for server-published cartridges
// (issue #167). The app may only move forward to a newer complete snapshot;
// realtime payloads are hints and every hint is followed by an authoritative
// fetch.

import { isCartridgeLike } from './cartridgeStorage.js';

export function normalizeRevision(value) {
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function isNewerRevision(currentRevision, nextRevision) {
  const current = normalizeRevision(currentRevision);
  const next = normalizeRevision(nextRevision);
  if (next === null) return false;
  if (current === null) return true;
  return next > current;
}

export function publicationFromRow(row) {
  return {
    source: row?.cartridge_source ?? null,
    publishedAt: row?.cartridge_published_at ?? null,
    updatedAt: row?.updated_at ?? null,
  };
}

// Validate one authoritative wedding row against the snapshot this device
// already holds. Returns `{ snapshot, isUpdate, unchangedRevision }`, an
// `{ ignored: true }` result for an older revision, or `{ error }` for a partial
// or invalid row. Callers must never cache an error result.
export function applyPublishedRow({ current = null, row, weddingId } = {}) {
  if (!row || typeof row !== 'object') {
    return { error: 'empty' };
  }
  if (!row.cartridge) {
    return { error: 'missing' };
  }
  if (
    !isCartridgeLike(row.cartridge) ||
    row.cartridge.weddingId !== weddingId ||
    (row.wedding_id && row.wedding_id !== weddingId)
  ) {
    return { error: 'invalid' };
  }

  const revision = normalizeRevision(row.cartridge_revision);
  const currentRevision = normalizeRevision(current?.revision);
  const hasCurrent = Boolean(current?.cartridge);

  if (hasCurrent && revision !== currentRevision) {
    if (!isNewerRevision(currentRevision, revision)) {
      return { ignored: true, reason: 'older', revision };
    }
  }

  return {
    snapshot: {
      weddingId,
      cartridge: row.cartridge,
      revision,
      publication: publicationFromRow(row),
      freshness: 'current',
    },
    isUpdate: hasCurrent && revision !== currentRevision,
    unchangedRevision: hasCurrent && revision === currentRevision,
  };
}

// Sync is only fully green when the cartridge is current AND the live-state
// catch-up has finished. Offline/error states win over a stale "connected"
// realtime status.
export function resolveEffectiveSyncStatus({
  syncStatus = 'disabled',
  liveCaughtUp = true,
  cartridgeFreshness = 'current',
  online = true,
} = {}) {
  if (syncStatus === 'disabled') return 'disabled';
  if (!online || cartridgeFreshness === 'offline' || syncStatus === 'offline') {
    return 'offline';
  }
  if (syncStatus === 'error' || cartridgeFreshness === 'error') return 'error';
  if (!liveCaughtUp || cartridgeFreshness !== 'current') return 'connecting';
  return syncStatus;
}
