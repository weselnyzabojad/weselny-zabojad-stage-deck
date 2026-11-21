import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../helpers/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #643 speech metadata cleanup', () => {
  it('removes the five fields from the domain and example', () => {
    const speech = json('schema/domains/speeches.json').$defs.speech.properties;
    expect(speech.durationMin).toBeUndefined();
    expect(speech.mic).toBeUndefined();
    expect(speech.cue).toBeUndefined();
    expect(speech.readFrom).toBeUndefined();
    expect(speech.consent.properties.confirmedBy).toBeUndefined();
    for (const item of json('schema/domains/speeches.example.json').speeches) {
      expect(item).not.toHaveProperty('durationMin');
      expect(item).not.toHaveProperty('mic');
      expect(item).not.toHaveProperty('cue');
      expect(item).not.toHaveProperty('readFrom');
      expect(item.consent?.confirmedBy).toBeUndefined();
    }
  });

  it('keeps only the mode helpers in the runtime speech module', () => {
    const schema = json('schema/domains/speeches.json').$defs.speech.properties;
    for (const field of ['time', 'language', 'delivery', 'mcIntro']) {
      expect(schema[field], field).toBeUndefined();
    }
    expect(schema.consent.properties.storeScript).toBeUndefined();
    expect(schema.consent.properties.confirmedAt).toBeUndefined();
    expect(read('src/lib/speeches.js')).not.toContain('resolveSpeeches');
  });

  it('maps only identity metadata into speech records', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    expect(result.cartridge.speeches).toEqual([
      {
        id: 'bartek',
        order: 1,
        speaker: { name: 'Bartek', relationship: 'Best man' },
      },
    ]);
    expect(result.cartridge.speeches[0]).not.toHaveProperty('script');
    expect(read('src/components/SpeechesCard.jsx')).not.toContain('speech.durationMin');
    expect(read('src/components/SpeechesCard.jsx')).not.toContain('speech.mic');
    expect(read('src/components/SpeechesCard.jsx')).not.toContain('speech.cue');
  });

  it('uses the dedicated speech cache instead of the old speaker cache', () => {
    expect(read('src/lib/speechScriptCache.js')).toContain('speechScriptCacheKey');
    expect(read('src/lib/speechScriptCache.js')).not.toContain('durationMin');
    expect(read('src/components/SpeakerView.jsx')).not.toContain('speakerCache');
  });
});
