import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { speechPairsToScriptBlocks } from '../src/lib/speechScriptBlocks.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1174 speech reader wiring', () => {
  it('maps speaker/translation pairs to viewer blocks', () => {
    expect(
      speechPairsToScriptBlocks({
        pairs: [
          { speaker: 'Dzień dobry', translation: 'Bonjour' },
          { speaker: 'Dziękuję', translation: null },
        ],
      }),
    ).toEqual([
      { id: 0, langA_text: 'Dzień dobry', langB_text: 'Bonjour' },
      { id: 1, langA_text: 'Dziękuję', langB_text: '' },
    ]);
  });

  it('falls back to a single script block for legacy LIGHT speeches', () => {
    expect(speechPairsToScriptBlocks({ script: 'Legacy script' })).toEqual([
      { id: 0, langA_text: 'Legacy script', langB_text: '' },
    ]);
    expect(speechPairsToScriptBlocks({ script: { text: 'Envelope text' } })).toEqual([
      { id: 0, langA_text: 'Envelope text', langB_text: '' },
    ]);
  });

  it('returns an empty list when no text is available', () => {
    expect(speechPairsToScriptBlocks({})).toEqual([]);
    expect(speechPairsToScriptBlocks({ pairs: [], script: '' })).toEqual([]);
  });

  it('renders the shared viewer in both speech surfaces', () => {
    const mc = read('src/components/SpeechesCard.jsx');
    expect(mc).toContain('BilingualScriptViewer');
    expect(mc).toContain('initialActive="b"');
    expect(mc).not.toContain('reader.data.pairs.map');

    const speaker = read('src/components/SpeakerView.jsx');
    expect(speaker).toContain('BilingualScriptViewer');
    expect(speaker).toContain('initialActive="a"');
    expect(speaker).not.toContain('speechAccess.speech.pairs.map');
    expect(speaker).not.toContain('speaker.translationLabel');
  });

  it('keeps the MC modal and decrypt/error states', () => {
    const mc = read('src/components/SpeechesCard.jsx');
    expect(mc).toContain('ModalShell');
    expect(mc).toContain("reader.status === 'loading'");
    expect(mc).toContain("reader.status === 'error'");
    expect(mc).toContain('speeches.decrypting');
    expect(mc).toContain('speeches.readerUnavailable');
    expect(mc).toContain('speechBundle.openSpeech');
  });

  it('keeps speaker consent, revocation and offline states intact', () => {
    const speaker = read('src/components/SpeakerView.jsx');
    expect(speaker).toContain("speechAccess.status === 'revoked'");
    expect(speaker).toContain("speechAccess.status === 'error'");
    expect(speaker).toContain('speaker.offlineNotice');
    expect(speaker).toContain('speaker.offTitle');
  });
});
