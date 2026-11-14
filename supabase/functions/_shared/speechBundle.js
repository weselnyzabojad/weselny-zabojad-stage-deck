// Issue #923: whole-script speech bundle encryption.
// The plaintext never leaves the server; each speech has its own HKDF-derived
// AES-256-GCM key and revision/version-bound additional data.

import {
  bytesToBase64Url,
  base64UrlToBytes,
  deriveSpeechKeyBytes,
} from './speechSecrets.js';

const ALG = 'AES-256-GCM';
const KEY_VERSION = 1;
const MARKER = /\{\{secret\}\}([\s\S]*?)\{\{\/secret\}\}/g;
const TOKEN = /\{\{secret:[A-Za-z0-9_-]+\}\}/g;

export function stripSecretMarkers(value) {
  return String(value ?? '')
    .replace(MARKER, (_match, plaintext) => plaintext)
    .replace(TOKEN, '');
}

function aad(weddingId, speechId, revision, version) {
  return new TextEncoder().encode(`${weddingId}:${speechId}:${revision}:${version}`);
}

async function aesKey(masterKey, weddingId, speechId, version) {
  const raw = await deriveSpeechKeyBytes(masterKey, weddingId, speechId, version);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptSpeechScript({
  masterKey,
  weddingId,
  speechId,
  revision,
  plaintext,
  version = KEY_VERSION,
}) {
  const key = await aesKey(masterKey, weddingId, speechId, version);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = stripSecretMarkers(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad(weddingId, speechId, revision, version) },
    key,
    new TextEncoder().encode(body),
  );
  return {
    alg: ALG,
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)),
    keyVersion: version,
    revision,
  };
}

export async function decryptSpeechScript({
  masterKey,
  weddingId,
  speechId,
  revision,
  entry,
}) {
  const version = Number.isInteger(entry?.keyVersion) ? entry.keyVersion : KEY_VERSION;
  const key = await aesKey(masterKey, weddingId, speechId, version);
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64UrlToBytes(entry.iv),
      additionalData: aad(weddingId, speechId, revision, version),
    },
    key,
    base64UrlToBytes(entry.ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

export { ALG as SPEECH_BUNDLE_ALG, KEY_VERSION as SPEECH_BUNDLE_KEY_VERSION };
