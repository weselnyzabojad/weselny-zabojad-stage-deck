// Encrypted sensitive notes (project.md D4 / TODO 1).
//
// VIP/family notes and the vendor contact list are encrypted client-side with
// WebCrypto AES-GCM before they ever reach Supabase. The key is held only on
// the host/MC device (`wzsd:v1:host-key`) and is never stored in the cartridge,
// the sync payload, logs or URLs.
//
// Stored bundle shape: { v: 1, alg: 'AES-GCM', iv, ciphertext } (base64).

export const HOST_KEY_STORAGE_KEY = 'wzsd:v1:host-key';
export const SENSITIVE_BUNDLE_VERSION = 1;

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function requireCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new Error('WebCrypto is unavailable in this environment.');
  }
  return globalThis.crypto;
}

export function isValidHostKey(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    return base64ToBytes(value.trim()).byteLength === 32;
  } catch {
    return false;
  }
}

export function createHostKey() {
  const cryptoApi = requireCrypto();
  const bytes = new Uint8Array(32);
  cryptoApi.getRandomValues(bytes);
  return bytesToBase64(bytes);
}

export function loadStoredHostKey(storage) {
  const store = getStorage(storage);
  if (!store) return null;
  try {
    const raw = store.getItem(HOST_KEY_STORAGE_KEY);
    return isValidHostKey(raw) ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function saveStoredHostKey(key, storage) {
  const store = getStorage(storage);
  if (!store || !isValidHostKey(key)) return false;
  try {
    store.setItem(HOST_KEY_STORAGE_KEY, key.trim());
    return true;
  } catch {
    return false;
  }
}

export function clearStoredHostKey(storage) {
  const store = getStorage(storage);
  if (!store) return false;
  try {
    store.removeItem(HOST_KEY_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

async function importKey(keyBase64, usage) {
  const cryptoApi = requireCrypto();
  if (!isValidHostKey(keyBase64)) throw new Error('Invalid host key.');
  return cryptoApi.subtle.importKey(
    'raw',
    base64ToBytes(keyBase64),
    { name: 'AES-GCM' },
    false,
    [usage],
  );
}

export async function encryptSensitiveNotes(payload, keyBase64) {
  const cryptoApi = requireCrypto();
  const key = await importKey(keyBase64, 'encrypt');
  const iv = new Uint8Array(12);
  cryptoApi.getRandomValues(iv);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload ?? {}));
  const ciphertext = await cryptoApi.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  return {
    v: SENSITIVE_BUNDLE_VERSION,
    alg: 'AES-GCM',
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptSensitiveNotes(bundle, keyBase64) {
  if (!bundle || bundle.v !== SENSITIVE_BUNDLE_VERSION || bundle.alg !== 'AES-GCM') {
    throw new Error('Unsupported sensitive-note bundle.');
  }
  const cryptoApi = requireCrypto();
  const key = await importKey(keyBase64, 'decrypt');

  try {
    const plaintext = await cryptoApi.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(bundle.iv) },
      key,
      base64ToBytes(bundle.ciphertext),
    );
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw new Error('Could not decrypt sensitive notes — the host key is wrong.');
  }
}

// Canonical payload synced only as ciphertext. Contacts are included whole
// because `contacts[].phone` is listed as sensitive and notes may be as well.
export function buildSensitivePayload(wedding) {
  return {
    vipAlerts: Array.isArray(wedding?.vipAlerts)
      ? wedding.vipAlerts
      : Array.isArray(wedding?.tact_and_vip_alerts)
        ? wedding.tact_and_vip_alerts
        : [],
    contacts: Array.isArray(wedding?.contacts) ? wedding.contacts : [],
  };
}

export function hasSensitiveData(payload) {
  return Boolean(
    payload && ((payload.vipAlerts?.length ?? 0) > 0 || (payload.contacts?.length ?? 0) > 0),
  );
}

// The published cartridge must never carry plaintext sensitive fields; the MC
// receives them from the decrypted bundle instead.
export function redactSensitiveFields(cartridge) {
  if (!cartridge || typeof cartridge !== 'object') return cartridge;
  const copy = { ...cartridge };
  delete copy.vipAlerts;
  delete copy.tact_and_vip_alerts;
  delete copy.contacts;
  return copy;
}

export function mergeSensitivePayload(wedding, payload) {
  if (!wedding || !payload) return wedding;
  return {
    ...wedding,
    ...(Array.isArray(payload.vipAlerts) ? { vipAlerts: payload.vipAlerts, tact_and_vip_alerts: payload.vipAlerts } : {}),
    ...(Array.isArray(payload.contacts) ? { contacts: payload.contacts } : {}),
  };
}

export function sensitivePayloadsEqual(a, b) {
  return JSON.stringify(buildComparable(a)) === JSON.stringify(buildComparable(b));
}

function buildComparable(payload) {
  return {
    vipAlerts: payload?.vipAlerts ?? [],
    contacts: payload?.contacts ?? [],
  };
}
