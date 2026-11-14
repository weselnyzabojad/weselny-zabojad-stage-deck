// Non-exportable speech keys cached in IndexedDB (issue #602).
//
// The key is scoped to a wedding + speech + key version. It is never written to
// localStorage or the cartridge.

const DB_NAME = 'wzsd-speech-keys';
const STORE = 'keys';

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export function speechKeyId({ weddingId, speechId, keyVersion = 1 }) {
  return `${weddingId}:${speechId}:v${keyVersion}`;
}

export async function saveSpeechKey(id, key) {
  const db = await openDb();
  if (!db || !key) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(key, id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

export async function loadSpeechKey(id) {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => resolve(null);
  });
}
