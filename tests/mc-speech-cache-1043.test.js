import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  clearSpeakerSpeech,
  loadSpeakerSpeech,
  saveSpeakerSpeech,
} from '../src/lib/speechScriptCache.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
}

describe('issue #1043 MC speech cache revalidation', () => {
  it('never loads a different revision or key version', () => {
    const store = fakeStorage();
    const speech = { script: 'hello', revision: 1 };
    saveSpeakerSpeech(
      { weddingId: 'W', speechId: 'S', speech, revision: 1, keyVersion: 2 },
      store,
    );
    expect(loadSpeakerSpeech('W', 'S', { storage: store, revision: 1, keyVersion: 2 })).toEqual(speech);
    expect(loadSpeakerSpeech('W', 'S', { storage: store, revision: 2, keyVersion: 2 })).toBeNull();
    // The mismatch removes the stale entry.
    expect(loadSpeakerSpeech('W', 'S', { storage: store })).toBeNull();
  });

  it('expires cached plaintext and clears on demand', () => {
    const store = fakeStorage();
    saveSpeakerSpeech(
      {
        weddingId: 'W',
        speechId: 'S',
        speech: { script: 'hello' },
        revision: 1,
        keyVersion: 1,
        expiresAt: '2030-01-01T00:00:00.000Z',
      },
      store,
    );
    expect(
      loadSpeakerSpeech('W', 'S', {
        storage: store,
        now: Date.parse('2031-01-01T00:00:00.000Z'),
      }),
    ).toBeNull();
    saveSpeakerSpeech({ weddingId: 'W', speechId: 'S', speech: { script: 'x' } }, store);
    clearSpeakerSpeech('W', 'S', store);
    expect(loadSpeakerSpeech('W', 'S', { storage: store })).toBeNull();
  });

  it('revalidates online and treats 401/403 as cache-clearing failures', () => {
    const client = read('src/lib/speechBundleClient.js');
    expect(client).toContain("action: 'list'");
    expect(client).toContain('current?.revision === revision');
    expect(client).toContain('error?.authFailure');
    expect(client).toContain('clearSpeakerSpeech(weddingId, speechId)');
    expect(client).toContain('Offline: keep the valid cached copy.');
  });

  it('shows a bundle error and retry even with no speeches', () => {
    const card = read('src/components/SpeechesCard.jsx');
    expect(card).toContain('const bundleError = speechBundle?.status === \'error\';');
    expect(card).toContain('if (!speeches?.length && !bundleError) return null;');
    expect(card).toContain('speeches.bundleUnavailable');
    expect(card).toContain('speeches.retry');
    const hook = read('src/hooks/useSpeechBundle.js');
    expect(hook).toContain('retry: () => setRefreshKey');
    expect(hook).toContain('expiresAt: session?.expiresAt');
  });
});
