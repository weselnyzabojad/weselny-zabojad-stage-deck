import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveSpeeches } from '../../src/lib/speeches.js';
import { saveSpeakerScript, loadSpeakerScript } from '../../src/lib/speakerCache.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

const storage = () => {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
};

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

  it('keeps speaker, order and script after the metadata review', () => {
    const [speech] = resolveSpeeches(json('schema/fixtures/real-jennifer-guillaume.json'));
    expect(speech.speaker.name).toBeTruthy();
    expect(speech.order).toBeTruthy();
    expect(speech.script).toHaveProperty('text');
    for (const field of ['durationMin', 'mic', 'cue', 'readFrom']) {
      expect(speech).not.toHaveProperty(field);
    }
    expect(speech.consent).not.toHaveProperty('confirmedBy');

    const schema = json('schema/domains/speeches.json').$defs.speech.properties;
    for (const field of ['time', 'language', 'delivery', 'mcIntro']) {
      expect(schema[field], field).toBeUndefined();
    }
    expect(schema.consent.properties.storeScript).toBeUndefined();
    expect(schema.consent.properties.confirmedAt).toBeUndefined();
  });

  it('no longer maps or renders the removed fields', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    const [speech] = result.cartridge.speeches;
    expect(speech).not.toHaveProperty('durationMin');
    expect(speech).not.toHaveProperty('mic');
    expect(speech).not.toHaveProperty('cue');
    expect(speech).not.toHaveProperty('readFrom');
    expect(read('src/components/SpeechesCard.jsx')).not.toContain('speech.durationMin');
    expect(read('src/components/SpeechesCard.jsx')).not.toContain('speech.mic');
    expect(read('src/components/SpeechesCard.jsx')).not.toContain('speech.cue');
    expect(read('src/lib/speakerCache.js')).not.toContain('speech.mic');
  });

  it('keeps the speaker cache and flow working without removed metadata', () => {
    const [speech] = resolveSpeeches(json('schema/fixtures/real-jennifer-guillaume.json'));
    const store = storage();
    expect(saveSpeakerScript('wedding-1', speech, store)).toBe(true);
    const cached = loadSpeakerScript('wedding-1', store);
    expect(cached.script.text).toBe(speech.script.text);
    expect(cached).not.toHaveProperty('mic');
    expect(cached).not.toHaveProperty('cue');
    expect(cached).not.toHaveProperty('readFrom');
    expect(cached).not.toHaveProperty('durationMin');
  });
});
