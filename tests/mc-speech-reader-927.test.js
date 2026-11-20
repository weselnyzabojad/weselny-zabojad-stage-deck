import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SpeechesCard from '../src/components/SpeechesCard.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const bundleSpeech = {
  id: 'speech_witness',
  order: 1,
  mode: 'COMPLEX',
  speaker: { name: 'Bartek', relationship: 'Best man' },
  speakerLanguage: 'PL',
  mcLanguage: 'FR',
  script: { ready: true, entry: { alg: 'AES-256-GCM' }, keyVersion: 1 },
  revision: 2,
};

describe('issue #927 MC speech list, live controls and reader', () => {
  it('renders the full list with live state and Start/End controls', () => {
    const html = renderToStaticMarkup(
      createElement(SpeechesCard, {
        mode: 'COMPLEX',
        speeches: [bundleSpeech],
        speechBundle: {
          status: 'ready',
          liveSpeechId: 'speech_witness',
          openSpeech: async () => ({}),
          startSpeech: async () => ({}),
          endSpeech: async () => ({}),
        },
      }),
    );
    expect(html).toContain('Bartek');
    expect(html).toContain('Best man');
    expect(html).toContain('Live');
    expect(html).toContain('End speech');
    expect(html).toContain('Read full screen');
  });

  it('hides script actions from LIGHT lists', () => {
    const html = renderToStaticMarkup(
      createElement(SpeechesCard, {
        mode: 'LIGHT',
        speeches: [{ ...bundleSpeech, script: { ready: false, entry: null } }],
        speechBundle: {
          status: 'ready',
          liveSpeechId: null,
          openSpeech: async () => ({}),
          startSpeech: async () => ({}),
          endSpeech: async () => ({}),
        },
      }),
    );
    expect(html).toContain('Bartek');
    expect(html).not.toContain('Read full screen');
    expect(html).not.toContain('Start speech');
  });

  it('uses the shared bilingual viewer in the existing reader modal', () => {
    const card = read('src/components/SpeechesCard.jsx');
    expect(card).toContain('BilingualScriptViewer');
    expect(card).toContain('speechPairsToScriptBlocks');
    expect(card).toContain('initialActive="b"');
    expect(card).toContain('ModalShell');
    expect(card).not.toContain('reader.data.pairs.map');
    expect(card).toContain('speechBundle.openSpeech');
    expect(card).toContain('speechBundle.startSpeech');
    expect(card).toContain('speechBundle.endSpeech');
  });

  it('uses the encrypted bundle and decrypts only when opened', () => {
    const hook = read('src/hooks/useSpeechBundle.js');
    expect(hook).toContain('fetchSpeechList');
    expect(hook).toContain('openSpeech');
    expect(hook).toContain('fetchSpeechScript');
    expect(hook).toContain('startLiveSpeech');
    expect(hook).toContain('endLiveSpeech');

    const client = read('src/lib/speechBundleClient.js');
    expect(client).toContain("action: 'start'");
    expect(client).toContain("action: 'end'");
    expect(client).toContain('loadSpeakerSpeech');
    expect(read('src/StageDeck.jsx')).toContain('useSpeechBundle');
    expect(read('src/views/McMasterView.jsx')).toContain('speechBundle={speechBundle}');
    expect(read('src/views/McMasterView.jsx')).toContain(
      "speechMode !== 'OFF' && speeches?.length > 0",
    );
  });

  it('keeps live-only UI on the MC card and blocks admin writes while live', () => {
    const card = read('src/components/SpeechesCard.jsx');
    expect(card).toContain('speeches.liveNow');
    expect(read('src/components/SpeechesChip.jsx')).not.toContain('speeches.liveNow');
    expect(read('src/components/SpeakerView.jsx')).not.toContain('speeches.liveNow');

    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain('Publishing is blocked while a speech is live.');
    expect(api).toContain('Restore is blocked while a speech is live.');
    expect(api).toContain('Delete is blocked while a speech is live.');
    expect(api).not.toContain('Speech mode cannot change while a speech is live.');

    const panel = read('src/admin/AdminSpeechesPanel.jsx');
    expect(panel).toContain('Boolean(liveSpeechId)');
  });

  it('keeps speech metadata editable during a live speech', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    const metadataBlock = api.slice(
      api.indexOf("action === 'upsert_speech_metadata'"),
      api.indexOf("action === 'rotate_speech_access'"),
    );
    expect(metadataBlock).not.toContain('Metadata cannot change while a speech is live');
    expect(read('src/admin/AdminSpeechesPanel.jsx')).not.toContain(
      'speech.id === liveSpeechId) return;\n    setBusy',
    );
  });

  it('clears decrypted scripts and keys on logout', () => {
    expect(read('src/App.jsx')).toContain('clearSpeechScriptsForWedding');
    expect(read('src/App.jsx')).toContain('clearSpeechKeysForWedding');
    expect(read('src/lib/speechScriptCache.js')).toContain('clearSpeechScriptsForWedding');
    expect(read('src/lib/speechKeyStore.js')).toContain('clearSpeechKeysForWedding');
  });

  it('ships complete MC copy in PL, EN and FR', () => {
    for (const locale of ['pl', 'en', 'fr']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of [
        'speeches.liveNow',
        'speeches.read',
        'speeches.startSpeech',
        'speeches.endSpeech',
        'speeches.readerLabel',
        'speeches.decrypting',
        'speeches.readerUnavailable',
        'speeches.translationLabel',
        'speeches.sourceLabel',
        'speeches.bundleUnavailable',
      ]) {
        expect(dict).toContain(`'${key}'`);
      }
    }
  });
});
