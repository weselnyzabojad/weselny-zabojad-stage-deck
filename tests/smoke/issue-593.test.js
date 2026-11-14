import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveSpeechMode } from '../../src/lib/speeches.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #593 speechMode domain ownership', () => {
  it('defines speechMode in the speeches domain', () => {
    const domain = json('schema/domains/speeches.json');
    expect(domain.properties.speechMode.enum).toEqual(['OFF', 'LIGHT', 'COMPLEX']);
    expect(json('schema/domains/speeches.example.json').speechMode).toBe('COMPLEX');
  });

  it('references the domain from the main schema', () => {
    expect(json('schema/wedding-schema-v1.1.json').properties.speechMode.$ref).toBe(
      'https://weselnyzabojad.example/schemas/domains/speeches.json#/properties/speechMode',
    );
  });

  it('removes speechMode from the cartridge example', () => {
    expect(json('schema/wedding-cartridge.example.json')).not.toHaveProperty('speechMode');
  });

  it('keeps the resolveSpeechMode fallback', () => {
    expect(resolveSpeechMode({}, [])).toBe('OFF');
    expect(resolveSpeechMode({ speechMode: 'LIGHT' }, [])).toBe('LIGHT');
    expect(resolveSpeechMode({}, [{ id: 's1' }])).toBe('COMPLEX');
  });
});
