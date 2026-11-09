// Read-only cache for the server-published wedding cartridge.
//
// A production role device may keep the last snapshot it downloaded for the
// wedding it joined, so the deck still works offline. This module deliberately
// exposes no activation, import, edit or reset API: only the admin surface may
// publish a cartridge, and only the server may decide which snapshot is current.
// Deprecated fields are stripped on save so they never return to the app.

import { sanitizeCartridge } from './cartridgeImporter.js';

const STORAGE_VERSION = 2;
export const CARTRIDGE_CACHE_PREFIX = `wzsd:v${STORAGE_VERSION}:cartridge:`;

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function cacheKey(weddingId) {
  return `${CARTRIDGE_CACHE_PREFIX}${weddingId}`;
}

export function isCartridgeLike(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      value.schemaVersion === '1.1' &&
      typeof value.weddingId === 'string' &&
      value.weddingId.length > 0 &&
      typeof value.couple === 'string' &&
      typeof value.syncPin === 'string' &&
      /^\d{4}$/.test(value.syncPin) &&
      Array.isArray(value.steps) &&
      value.steps.length > 0,
  );
}

function normalizeRevision(value) {
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeTimestamp(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function loadCachedCartridge(weddingId, storage) {
  if (typeof weddingId !== 'string' || weddingId.length === 0) return null;
  const store = getStorage(storage);
  if (!store) return null;

  try {
    const raw = store.getItem(cacheKey(weddingId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.weddingId !== weddingId) return null;
    if (!isCartridgeLike(parsed.cartridge)) return null;
    // A cache entry for another wedding must never be rendered here.
    if (parsed.cartridge.weddingId !== weddingId) return null;

    return {
      cartridge: sanitizeCartridge(parsed.cartridge),
      revision: normalizeRevision(parsed.revision),
      fetchedAt: normalizeTimestamp(parsed.fetchedAt),
    };
  } catch {
    return null;
  }
}

export function saveCachedCartridge(
  { weddingId, cartridge, revision = null, fetchedAt = null } = {},
  storage,
) {
  if (typeof weddingId !== 'string' || weddingId.length === 0) return false;
  if (!cartridge || cartridge.weddingId !== weddingId) return false;

  const cleaned = sanitizeCartridge(cartridge);
  if (!isCartridgeLike(cleaned)) return false;

  const store = getStorage(storage);
  if (!store) return false;

  try {
    store.setItem(
      cacheKey(weddingId),
      JSON.stringify({
        weddingId,
        revision: normalizeRevision(revision),
        fetchedAt: normalizeTimestamp(fetchedAt) ?? new Date().toISOString(),
        cartridge: cleaned,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearCachedCartridge(weddingId, storage) {
  if (typeof weddingId !== 'string' || weddingId.length === 0) return false;
  const store = getStorage(storage);
  if (!store) return false;

  try {
    store.removeItem(cacheKey(weddingId));
    return true;
  } catch {
    return false;
  }
}
