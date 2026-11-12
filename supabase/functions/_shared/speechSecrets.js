// Speech secret redaction crypto (issue #602).
//
// Sensitive spans are replaced with `{{secret:<id>}}` tokens. Values are stored
// only as AES-256-GCM ciphertext. Per-speech keys come from HKDF over the Edge
// master secret; the key is never stored in the cartridge.

const MARKER = /\{\{secret\}\}([\s\S]*?)\{\{\/secret\}\}/g;
const TOKEN = /\{\{secret:([A-Za-z0-9_-]+)\}\}/g;
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

export function parseSecretMarkers(text, { prefix = 'r' } = {}) {
  const secrets = [];
  let index = 0;
  const output = String(text ?? '').replace(MARKER, (_match, value) => {
    index += 1;
    const id = `${prefix}${index}`;
    secrets.push({ id, plaintext: value });
    return `{{secret:${id}}}`;
  });
  return { text: output, secrets };
}

export async function encryptSecret({
  masterKey,
  weddingId,
  speechId,
  redactionId,
  plaintext,
  version = KEY_VERSION,
}) {
  const key = await aesKey(masterKey, weddingId, speechId, version);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad(weddingId, speechId, redactionId, version) },
    key,
    new TextEncoder().encode(String(plaintext)),
  );
  return {
    id: redactionId,
    alg: ALG,
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)),
    keyVersion: version,
  };
}

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

export function listSecretTokens(text) {
  return [...String(text ?? '').matchAll(TOKEN)].map((match) => match[1]);
}

export { TOKEN as SECRET_TOKEN_PATTERN, MARKER as SECRET_MARKER_PATTERN };
