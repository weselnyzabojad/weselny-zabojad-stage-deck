// Offline cache for the assigned speaker script (TODO 8).
//
// The live sync carries `active_speech_id`; the script itself is cached on the
// speaker device so it survives reloads and a lost connection. Only the active,
// consented speech is stored — never the other speeches.

const STORAGE_VERSION = 1;
const KEY_PREFIX = `wzsd:v${STORAGE_VERSION}:speaker-script:`;

export function speakerScriptKey(weddingId) {
  return `${KEY_PREFIX}${weddingId}`;
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

export function saveSpeakerScript(weddingId, speech, storage) {
  const store = getStorage(storage);
  if (!store || !weddingId || !speech?.id) return false;
  // Never cache a script the couple did not consent to store/share.
  if (speech.scriptAllowed === false || speech.consent?.storeScript === false) return false;

  const payload = {
    id: speech.id,
    mode: speech.mode ?? 'COMPLEX',
    speaker: {
      name: speech.speaker?.name ?? 'Speaker',
      relationship: speech.speaker?.relationship ?? null,
      contact: speech.speaker?.contact ?? null,
    },
    time: speech.time ?? null,
    language: speech.language ?? null,
    delivery: speech.delivery ?? null,
    mcIntro: speech.mcIntro === true,
    script: {
      text: speech.script?.text ?? null,
      format: speech.script?.format ?? null,
      ready: speech.script?.ready === true,
      source: speech.script?.source ?? null,
    },
    visibleToRoles: Array.isArray(speech.visibleToRoles) ? speech.visibleToRoles : [],
    consent: speech.consent ?? { storeScript: true },
    scriptAllowed: true,
    savedAt: new Date().toISOString(),
  };

  try {
    store.setItem(speakerScriptKey(weddingId), JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadSpeakerScript(weddingId, storage) {
  const store = getStorage(storage);
  if (!store || !weddingId) return null;

  try {
    const raw = store.getItem(speakerScriptKey(weddingId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'string') return null;
    return { ...parsed, fromCache: true };
  } catch {
    return null;
  }
}

export function clearSpeakerScript(weddingId, storage) {
  const store = getStorage(storage);
  if (!store || !weddingId) return false;
  try {
    store.removeItem(speakerScriptKey(weddingId));
    return true;
  } catch {
    return false;
  }
}
