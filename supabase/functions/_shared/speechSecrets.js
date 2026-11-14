// Speech key derivation plus the legacy per-redaction decryptor used only by
// the one-time migration (issue #929). New speech content is encrypted as a
// whole script by speechBundle.js; no marker parser or token renderer remains.

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

export async function deriveSpeechKeyBytes(
  masterKey,
  weddingId,
  speechId,
  version = KEY_VERSION,
) {
  if (!masterKey) throw new Error('SPEECH_SECRET_MASTER_KEY is not configured.');
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
      info: new TextEncoder().encode(`speech:${speechId}:v${version}`),
    },
    material,
    256,
  );
  return new Uint8Array(bits);
}

async function aesKey(masterKey, weddingId, speechId, version) {
  const raw = await deriveSpeechKeyBytes(masterKey, weddingId, speechId, version);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function aad(weddingId, speechId, redactionId, version) {
  return new TextEncoder().encode(`${weddingId}:${speechId}:${redactionId}:${version}`);
}

// Legacy migration only: decrypts an old script.redactions entry so its
// plaintext can be merged into the new whole-script ciphertext.
export async function decryptSecret({
  masterKey,
  weddingId,
  speechId,
  redaction,
}) {
  const version = Number.isInteger(redaction?.keyVersion) ? redaction.keyVersion : KEY_VERSION;
  const key = await aesKey(masterKey, weddingId, speechId, version);
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64UrlToBytes(redaction.iv),
      additionalData: aad(weddingId, speechId, redaction.id, version),
    },
    key,
    base64UrlToBytes(redaction.ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

export { ALG as LEGACY_SECRET_ALG };

