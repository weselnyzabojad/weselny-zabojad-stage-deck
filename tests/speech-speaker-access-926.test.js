import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDeckIntent, normalizeRoleSession } from '../src/lib/sync/roleSession.js';
import {
  clearSpeakerSpeech,
  loadSpeakerSpeech,
  saveSpeakerSpeech,
  speechScriptCacheKey,
} from '../src/lib/speechScriptCache.js';
import {
  decryptSpeechEntry,
  parseBilingualScript,
} from '../src/lib/speechBundleClient.js';
import { encryptSpeechScript } from '../supabase/functions/_shared/speechBundle.js';
import { importSpeechKey } from '../src/lib/speechSecrets.js';
import { buildSpeechLink } from '../src/admin/adminUtils.js';
import { parseSpeechDoc } from '../supabase/functions/_shared/speechDoc.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const storage = () => {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
};

const weddingId = 'Test&Wedding-UM-2026-08-001';
const speechId = 'speech_witness';

describe('issue #926 per-speech speaker access', () => {
  it('parses a scoped speech link and preserves the speech id in the session', () => {
    expect(parseDeckIntent('/abc123/speaker', '?speech=speech_witness')).toMatchObject({
      roomCode: 'abc123',
      role: 'speaker',
      speechId: 'speech_witness',
    });
    expect(parseDeckIntent('/abc123/mc')).toEqual({
      roomCode: 'abc123',
      role: 'mc',
      requirePin: false,
    });
    const session = normalizeRoleSession({
      token: 'token',
      weddingId,
      role: 'speaker',
      roomId: `wzsd:${weddingId}`,
      expiresAt: Date.now() + 60_000,
      speechId,
    });
    expect(session.speechId).toBe(speechId);
  });

  it('builds the speech-specific admin link', () => {
    expect(buildSpeechLink('https://deck.example', 'abc123', speechId)).toBe(
      'https://deck.example/abc123/speaker?speech=speech_witness',
    );
  });

  it('caches only this speech, expires it and clears it on demand', () => {
    const store = storage();
    const speech = { id: speechId, speaker: { name: 'Bartek' }, pairs: [] };
    expect(
      saveSpeakerSpeech(
        { weddingId, speechId, speech, expiresAt: '2030-01-01T00:00:00.000Z' },
        store,
      ),
    ).toBe(true);
    expect(loadSpeakerSpeech(weddingId, speechId, { storage: store })).toEqual(speech);
    expect(loadSpeakerSpeech(weddingId, 'other', { storage: store })).toBeNull();
    expect(
      loadSpeakerSpeech(weddingId, speechId, {
        storage: store,
        now: Date.parse('2031-01-01T00:00:00.000Z'),
      }),
    ).toBeNull();
    expect(store.getItem(speechScriptCacheKey(weddingId, speechId))).toBeNull();

    saveSpeakerSpeech({ weddingId, speechId, speech }, store);
    clearSpeakerSpeech(weddingId, speechId, store);
    expect(loadSpeakerSpeech(weddingId, speechId, { storage: store })).toBeNull();
  });

  it('round-trips the whole script and extracts bilingual pairs', async () => {
    const parsed = parseSpeechDoc(
      'SPEAKER [FR]\nBonjour à tous\n\nMC [PL]\nWitajcie\n\nSPEAKER [FR]\nDeuxième partie\n\nMC [PL]\nDruga część\n',
      { speakerLanguage: 'FR', mcLanguage: 'PL' },
    );
    expect(parseBilingualScript(parsed.script)).toEqual([
      { speaker: 'Bonjour à tous', translation: 'Witajcie' },
      { speaker: 'Deuxième partie', translation: 'Druga część' },
    ]);

    const entry = await encryptSpeechScript({
      masterKey: 'local-32-byte-random-value-000000',
      weddingId,
      speechId,
      revision: 4,
      plaintext: 'Bonjour à tous',
    });
    const { bytesToBase64Url, deriveSpeechKeyBytes } = await import(
      '../supabase/functions/_shared/speechSecrets.js'
    );
    const raw = await deriveSpeechKeyBytes(
      'local-32-byte-random-value-000000',
      weddingId,
      speechId,
      1,
    );
    const realKey = await importSpeechKey(bytesToBase64Url(raw));
    await expect(
      decryptSpeechEntry({ entry, key: realKey, weddingId, speechId, revision: 4 }),
    ).resolves.toBe('Bonjour à tous');
  });

  it('ships isolated speech joins, scoped sessions and revocation', () => {
    const join = read('supabase/functions/join_room/index.ts');
    expect(join).toContain('const speechId =');
    expect(join).toContain("speaker:${speechId}");
    expect(join).toContain("from('speech_sessions')");
    expect(join).toContain('speech_id: speechId');
    expect(join).toContain('Incorrect PIN for this speech.');
    expect(join).toContain("role === 'speaker' && !speechId");

    const bundle = read('supabase/functions/speech_bundle/index.ts');
    expect(bundle).toContain('speakerAccessAllowed');
    expect(bundle).toContain("payload?.app_role === 'speaker' ? 'speech_sessions'");
    expect(bundle).toContain("record.id === speakerSpeechId && record.status === 'PUBLISHED'");

    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain("action === 'rotate_speech_access'");
    expect(api).toContain("action === 'revoke_speech_access'");
    expect(api).toContain('bcrypt.hashSync(pin, 10)');
    expect(api).toContain('revokeSpeechSessions');
    expect(api).not.toContain("action === 'set_speech_mode'");
  });

  it('renders the dedicated bilingual view with cache and revoked states', () => {
    const view = read('src/components/SpeakerView.jsx');
    expect(view).toContain('BilingualScriptViewer');
    expect(view).toContain('speechPairsToScriptBlocks');
    expect(view).toContain("t('speaker.revokedTitle')");
    expect(view).toContain("t('speaker.offlineNotice')");
    expect(view).toContain('speechAccess.speech');
    expect(read('src/StageDeck.jsx')).toContain('useSpeakerSpeech');
    expect(read('src/App.jsx')).toContain('clearSpeakerAccessCache');
  });

  it('adds speaker access and QR controls to the admin panel', () => {
    const panel = read('src/admin/AdminSpeechesPanel.jsx');
    expect(panel).toContain('rotateSpeechAccess');
    expect(panel).toContain('revokeSpeechAccess');
    expect(panel).toContain('Copy speaker link');
    expect(panel).toContain('AdminQrCards');
    expect(read('src/admin/adminUtils.js')).toContain('buildSpeechLink');
  });

  it('keeps the new copy in PL, EN and FR', () => {
    for (const locale of ['pl', 'en', 'fr']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of [
        'join.speechTitle',
        'join.speechSubtitle',
        'speaker.revokedTitle',
        'speaker.revokedBody',
        'speaker.translationLabel',
        'speaker.sourceLabel',
        'speaker.offlineNotice',
      ]) {
        expect(dict).toContain(`'${key}'`);
      }
    }
  });
});
