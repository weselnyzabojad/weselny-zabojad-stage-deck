// Offline copy of a COMPLEX speaker's dedicated speech (issue #926).
//
// The cache is explicit about the wedding and speech id and expires with the
// server session/wedding TTL. It is cleared on logout and on revocation.

const STORAGE_VERSION = 1;
const KEY_PREFIX = `wzsd:v${STORAGE_VERSION}:speech-script:`;

export function speechScriptCacheKey(weddingId, speechId) {
  return `${KEY_PREFIX}${weddingId}:${speechId}`;
}

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveSpeakerSpeech({ weddingId, speechId, speech, expiresAt = null }, storage) {
  const store = getStorage(storage);
  if (!store || !weddingId || !speechId || !speech || typeof speech !== 'object') return false;
  try {
    store.setItem(
      speechScriptCacheKey(weddingId, speechId),
      JSON.stringify({
        weddingId,
        speechId,
        speech,
        expiresAt,
        savedAt: new Date().toISOString(),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function loadSpeakerSpeech(weddingId, speechId, { storage, now = Date.now() } = {}) {
  const store = getStorage(storage);
  if (!store || !weddingId || !speechId) return null;
  try {
    const raw = store.getItem(speechScriptCacheKey(weddingId, speechId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      parsed.weddingId !== weddingId ||
      parsed.speechId !== speechId ||
      !parsed.speech ||
      typeof parsed.speech !== 'object'
    ) {
      return null;
    }
    if (parsed.expiresAt && Date.parse(parsed.expiresAt) <= now) {
      store.removeItem(speechScriptCacheKey(weddingId, speechId));
      return null;
    }
    return parsed.speech;
  } catch {
    return null;
  }
}

export function clearSpeakerSpeech(weddingId, speechId, storage) {
  const store = getStorage(storage);
  if (!store || !weddingId || !speechId) return false;
  try {
    store.removeItem(speechScriptCacheKey(weddingId, speechId));
    return true;
  } catch {
    return false;
  }
}
