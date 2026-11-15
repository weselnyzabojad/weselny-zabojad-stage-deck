// Browser client for the dedicated speech bundle (issue #926).
//
// The speaker session token is scoped to one wedding + speech. The server
// returns only encrypted ciphertext and the per-speech key; decryption happens
// on the device so the offline copy keeps working without another request.

import { getSyncConfig } from './sync/syncConfig.js';
import { importSpeechKey } from './speechSecrets.js';
import { deleteSpeechKey, saveSpeechKey, speechKeyId } from './speechKeyStore.js';
import {
  clearSpeakerSpeech,
  loadSpeakerSpeech,
  saveSpeakerSpeech,
} from './speechScriptCache.js';

function base64UrlToBytes(value) {
  const text = String(value ?? '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = text + '='.repeat((4 - (text.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function scriptAad(weddingId, speechId, revision, version) {
  return new TextEncoder().encode(`${weddingId}:${speechId}:${revision}:${version}`);
}

export function parseBilingualScript(text) {
  const source = String(text ?? '').replace(/\r\n/g, '\n');
  const blocks = [];
  let current = null;
  for (const line of source.split('\n')) {
    if (/^\s*SPEAKER:\s*$/.test(line)) {
      if (current) blocks.push(current);
      current = { role: 'SPEAKER', lines: [] };
    } else if (/^\s*MC:\s*$/.test(line)) {
      if (current?.role === 'SPEAKER') {
        blocks.push(current);
        current = { role: 'MC', lines: [] };
      }
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);

  const pairs = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block.role !== 'SPEAKER') continue;
    const next = blocks[index + 1];
    const speaker = block.lines.join('\n').trim();
    if (!speaker) continue;
    const translation = next?.role === 'MC' ? next.lines.join('\n').trim() : '';
    pairs.push({ speaker, translation: translation || null });
    if (next?.role === 'MC') index += 1;
  }
  return pairs;
}

async function callSpeechBundle(body, accessToken) {
  const config = getSyncConfig();
  if (!config.enabled || !config.functionsUrl) {
    throw Object.assign(new Error('Speech sync is not configured.'), { status: 0 });
  }
  if (!accessToken) {
    throw Object.assign(new Error('Join the speech first.'), { status: 401 });
  }
  const response = await fetch(`${config.functionsUrl}/speech_bundle`, {
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
    throw Object.assign(new Error('The speech is unavailable.'), {
      status: response.status,
      code: data?.error ?? null,
      authFailure: response.status === 401 || response.status === 403,
    });
  }
  return data;
}

export async function decryptSpeechEntry({ entry, key, weddingId, speechId, revision }) {
  if (!entry?.ciphertext || !entry?.iv || !key) throw new Error('The speech is unavailable.');
  const version = Number.isInteger(entry.keyVersion) ? entry.keyVersion : 1;
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64UrlToBytes(entry.iv),
      additionalData: scriptAad(weddingId, speechId, revision, version),
    },
    key,
    base64UrlToBytes(entry.ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

export async function fetchSpeakerSpeech({ accessToken, weddingId, speechId }) {
  const data = await callSpeechBundle({ action: 'list' }, accessToken);
  const speech = (data.speeches ?? []).find((row) => row.id === speechId);
  if (!speech?.script) throw Object.assign(new Error('The speech is unavailable.'), { status: 404 });
  if (!Number.isInteger(speech.revision)) {
    throw Object.assign(new Error('The speech is unavailable.'), { status: 404 });
  }

  const keyData = await callSpeechBundle(
    { action: 'key', speechId, keyVersion: speech.script.keyVersion ?? 1 },
    accessToken,
  );
  const key = await importSpeechKey(keyData.key);
  await saveSpeechKey(
    speechKeyId({ weddingId, speechId, keyVersion: speech.script.keyVersion ?? 1 }),
    key,
  );
  const plaintext = await decryptSpeechEntry({
    entry: speech.script,
    key,
    weddingId,
    speechId,
    revision: speech.revision,
  });

  return {
    id: speech.id,
    order: speech.order,
    speaker: speech.speaker,
    speakerLanguage: speech.speakerLanguage,
    mcLanguage: speech.mcLanguage,
    revision: speech.revision,
    pairs: parseBilingualScript(plaintext),
    script: plaintext,
  };
}

// MC list: every non-deleted speech with metadata and, when published, the
// encrypted script envelope. Nothing is decrypted until the MC opens a speech.
export async function fetchSpeechList({ accessToken }) {
  return callSpeechBundle({ action: 'list' }, accessToken);
}

export async function fetchSpeechScript({ accessToken, weddingId, speechId, speech, expiresAt = null }) {
  const revision = speech?.revision;
  const keyVersion = speech?.script?.keyVersion ?? 1;
  const cached = loadSpeakerSpeech(weddingId, speechId, { revision, keyVersion });
  if (cached) {
    // Revalidate the revision/access online before reopening plaintext. A
    // network failure may still use the cache; 401/403 clears it.
    try {
      const data = await callSpeechBundle({ action: 'list' }, accessToken);
      const current = (data.speeches ?? []).find((row) => row.id === speechId);
      if (current?.revision === revision) return cached;
      clearSpeakerSpeech(weddingId, speechId);
    } catch (error) {
      if (error?.authFailure) {
        clearSpeakerSpeech(weddingId, speechId);
        await deleteSpeechKey(speechKeyId({ weddingId, speechId, keyVersion }));
        throw error;
      }
      // Offline: keep the valid cached copy.
      return cached;
    }
  }
  if (!speech?.script) throw Object.assign(new Error('The speech is unavailable.'), { status: 404 });
  if (!Number.isInteger(revision)) {
    throw Object.assign(new Error('The speech is unavailable.'), { status: 404 });
  }
  try {
    const keyData = await callSpeechBundle(
      { action: 'key', speechId, keyVersion },
      accessToken,
    );
    const key = await importSpeechKey(keyData.key);
    await saveSpeechKey(
      speechKeyId({ weddingId, speechId, keyVersion }),
      key,
    );
    const plaintext = await decryptSpeechEntry({
      entry: speech.script,
      key,
      weddingId,
      speechId,
      revision,
    });
    const decoded = {
      id: speechId,
      order: speech.order,
      speaker: speech.speaker,
      speakerLanguage: speech.speakerLanguage,
      mcLanguage: speech.mcLanguage,
      revision,
      pairs: parseBilingualScript(plaintext),
      script: plaintext,
    };
    saveSpeakerSpeech({
      weddingId,
      speechId,
      speech: decoded,
      revision,
      keyVersion,
      expiresAt,
    });
    return decoded;
  } catch (error) {
    if (error?.authFailure) {
      clearSpeakerSpeech(weddingId, speechId);
      await deleteSpeechKey(speechKeyId({ weddingId, speechId, keyVersion }));
    }
    throw error;
  }
}

export async function startLiveSpeech({ accessToken, speechId }) {
  return callSpeechBundle({ action: 'start', speechId }, accessToken);
}

export async function endLiveSpeech({ accessToken }) {
  return callSpeechBundle({ action: 'end' }, accessToken);
}

export async function clearSpeakerAccessCache({ weddingId, speechId }) {
  if (!weddingId || !speechId) return;
  clearSpeakerSpeech(weddingId, speechId);
  await deleteSpeechKey(speechKeyId({ weddingId, speechId }));
}

export { loadSpeakerSpeech, saveSpeakerSpeech };
