// Browser client for the MC game question bundles (issue #934).
//
// The server returns only ciphertext plus the per-game key. Decryption happens
// on the MC device so the cached question set keeps working offline. Question
// text is never included in logs, errors or the wedding cartridge.

import { getSyncConfig } from './sync/syncConfig.js';

function base64UrlToBytes(value) {
  const text = String(value ?? '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = text + '='.repeat((4 - (text.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function bundleAad(weddingId, gameType, revision, version) {
  return new TextEncoder().encode(`${weddingId}:game:${gameType}:${revision}:${version}`);
}

async function callGameBundle(body, accessToken) {
  const config = getSyncConfig();
  if (!config.enabled || !config.functionsUrl) {
    throw Object.assign(new Error('Game sync is not configured.'), { status: 0 });
  }
  if (!accessToken) {
    throw Object.assign(new Error('Join as the MC first.'), { status: 401 });
  }
  const response = await fetch(`${config.functionsUrl}/game_bundle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error('The game questions are unavailable.'), {
      status: response.status,
      code: data?.error ?? null,
    });
  }
  return data;
}

export async function fetchGameBundleList({ accessToken }) {
  return callGameBundle({ action: 'list' }, accessToken);
}

export async function fetchGameBundleKey({ accessToken, gameType, keyVersion = 1 }) {
  const data = await callGameBundle(
    { action: 'key', gameType, keyVersion },
    accessToken,
  );
  if (typeof data?.key !== 'string' || !data.key) {
    throw Object.assign(new Error('The game questions are unavailable.'), { status: 404 });
  }
  return importGameKey(data.key);
}

export async function importGameKey(base64Url) {
  return crypto.subtle.importKey(
    'raw',
    base64UrlToBytes(base64Url),
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );
}

export async function decryptGameQuestions({
  entry,
  key,
  weddingId,
  gameType,
  revision,
}) {
  if (
    !entry?.ciphertext ||
    !entry?.iv ||
    !key ||
    !weddingId ||
    !gameType ||
    !Number.isInteger(revision)
  ) {
    throw new Error('The game questions are unavailable.');
  }
  if (entry.alg && entry.alg !== 'AES-256-GCM') {
    throw new Error('The game questions are unavailable.');
  }
  const version = Number.isInteger(entry.keyVersion) ? entry.keyVersion : 1;
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64UrlToBytes(entry.iv),
      additionalData: bundleAad(weddingId, gameType, revision, version),
    },
    key,
    base64UrlToBytes(entry.ciphertext),
  );
  const questions = JSON.parse(new TextDecoder().decode(plaintext));
  if (!Array.isArray(questions)) throw new Error('The game questions are unavailable.');
  return questions;
}

// One bundle row -> decrypted question array. The caller caches the result and
// never persists the key.
export async function loadGameBundleQuestions({
  accessToken,
  weddingId,
  game,
}) {
  if (!game?.bundle || !Number.isInteger(game.revision)) {
    throw Object.assign(new Error('The game questions are unavailable.'), { status: 404 });
  }
  const key = await fetchGameBundleKey({
    accessToken,
    gameType: game.gameType,
    keyVersion: game.bundle.keyVersion ?? 1,
  });
  return decryptGameQuestions({
    entry: game.bundle,
    key,
    weddingId,
    gameType: game.gameType,
    revision: game.revision,
  });
}
