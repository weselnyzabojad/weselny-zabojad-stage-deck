import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveActiveSpeech } from '../src/lib/speeches.js';
import en from '../src/i18n/en.js';
import fr from '../src/i18n/fr.js';
import pl from '../src/i18n/pl.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #724 MC speech live controls removal', () => {
  it('removes the live chip status and Go/Stop live controls', () => {
    const chip = read('src/components/SpeechesChip.jsx');
    const card = read('src/components/SpeechesCard.jsx');
    expect(chip).not.toContain('speeches.live');
    expect(chip).not.toContain('activeSpeechId');
    expect(card).not.toContain('speeches.goLive');
    expect(card).not.toContain('speeches.stopLive');
    expect(card).not.toContain('onSelect');
  });

  it('removes the unused live labels from every locale', () => {
    for (const dictionary of [en, fr, pl]) {
      expect(dictionary).not.toHaveProperty('speeches.live');
      expect(dictionary).not.toHaveProperty('speeches.goLive');
      expect(dictionary).not.toHaveProperty('speeches.stopLive');
    }
  });

  it('keeps active_speech_id as the Speaker selection source', () => {
    expect(read('src/config/liveSyncState.js')).toContain('active_speech_id');
    expect(read('src/lib/cartridgeValidation.js')).toContain('active_speech_id');
    const only = { id: 's1', speaker: { name: 'Anna' } };
    expect(resolveActiveSpeech([only], null)).toBe(only);
  });
});
