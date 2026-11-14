// Shared AES-256-GCM bundle crypto. Speech scripts (#923) and game question
// bundles (#931) derive independent keys from the same master secret through
// HKDF, so neither can decrypt the other's ciphertext.

const ALG = 'AES-256-GCM';
const KEY_VERSION = 1;

export function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlToBytes(value) {
  const text = String(value ?? '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = text + '='.repeat((4 - (text.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function deriveScopedKeyBytes({
  masterKey,
  weddingId,
  scope,
  id,
  version = KEY_VERSION,
  secretName = 'SPEECH_SECRET_MASTER_KEY',
}) {
  if (!masterKey) throw new Error(`${secretName} is not configured.`);
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(masterKey)),
    'HKDF',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(String(weddingId)),
      info: new TextEncoder().encode(`${scope}:${id}:v${version}`),
    },
    material,
    256,
  );
  return new Uint8Array(bits);
}

async function aesKey({ masterKey, weddingId, scope, id, version, secretName }) {
  const raw = await deriveScopedKeyBytes({
    masterKey,
    weddingId,
    scope,
    id,
    version,
    secretName,
  });
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

function aad({ weddingId, scope, id, revision, version, aadPrefix }) {
  const prefix = aadPrefix ?? `${scope}:`;
  return new TextEncoder().encode(`${weddingId}:${prefix}${id}:${revision}:${version}`);
}

export async function encryptScopedBundle({
  masterKey,
  weddingId,
  scope,
  id,
  revision,
  plaintext,
  version = KEY_VERSION,
  secretName = 'SPEECH_SECRET_MASTER_KEY',
  aadPrefix = null,
}) {
  const key = await aesKey({ masterKey, weddingId, scope, id, version, secretName });
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: aad({ weddingId, scope, id, revision, version, aadPrefix }),
    },
    key,
    new TextEncoder().encode(String(plaintext ?? '')),
  );
  return {
    alg: ALG,
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)),
    keyVersion: version,
    revision,
  };
}

export async function decryptScopedBundle({
  masterKey,
  weddingId,
  scope,
  id,
  revision,
  entry,
  secretName = 'SPEECH_SECRET_MASTER_KEY',
  aadPrefix = null,
}) {
  const version = Number.isInteger(entry?.keyVersion) ? entry.keyVersion : KEY_VERSION;
  const key = await aesKey({ masterKey, weddingId, scope, id, version, secretName });
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64UrlToBytes(entry?.iv),
      additionalData: aad({ weddingId, scope, id, revision, version, aadPrefix }),
    },
    key,
    base64UrlToBytes(entry?.ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

export { ALG as BUNDLE_ALG, KEY_VERSION as BUNDLE_KEY_VERSION };
