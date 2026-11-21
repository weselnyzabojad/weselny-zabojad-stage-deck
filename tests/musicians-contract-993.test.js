import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from './helpers/googleDocCartridge.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');

function map(markdown) {
  return googleDocTemplateToCartridge(parseGoogleDocTemplate(markdown));
}

describe('issue #993 musicians Doc contract', () => {
  it('maps the canonical template boolean to false', () => {
    const result = map(template);
    expect(result.errors).toEqual([]);
    expect(result.cartridge.musicians).toEqual({ expected: false, items: [] });
  });

  it('maps true without sourcing details from the Doc', () => {
    const result = map(
      template.replace(
        '| Musician expected | false | true or false |',
        '| Musician expected | true | true or false |',
      ),
    );
    expect(result.cartridge.musicians).toEqual({ expected: true, items: [] });
  });

  it('defaults a missing section to false with a warning', () => {
    const withoutSection = template.replace(/## MUSICIANS[\s\S]*?## PHOTO PLAN/, '## PHOTO PLAN');
    const result = map(withoutSection);
    expect(result.cartridge.musicians.expected).toBe(false);
    expect(result.warnings.join(' ')).toContain('MUSICIANS: missing Musician expected');
  });

  it('defaults an invalid value to false with a warning', () => {
    const result = map(
      template.replace(
        '| Musician expected | false | true or false |',
        '| Musician expected | maybe | true or false |',
      ),
    );
    expect(result.cartridge.musicians.expected).toBe(false);
    expect(result.warnings.join(' ')).toContain('MUSICIANS: invalid Musician expected');
  });

  it('declares the domain and field map contract', () => {
    const domain = JSON.parse(read('schema/domains/musicians.json'));
    expect(domain.properties.musicians.properties.expected.type).toBe('boolean');
    expect(domain.properties.musicians.properties.items.items.$ref).toBe('#/$defs/musician');
    expect(domain.$defs.musician.additionalProperties).toBe(false);

    const mapFile = JSON.parse(read('schema/google-doc-field-map.json'));
    expect(mapFile.files['musicians.example.json']['musicians.expected']).toBe('required');
    expect(mapFile.files['musicians.example.json']['musicians.items[].instrument']).toBe('no');
    expect(mapFile.files['musicians.example.json']['musicians.items[].endTime']).toBe('no');
  });

  it('references the domain from both schema copies', () => {
    for (const file of [
      'schema/wedding-schema-v1.1.json',
      'supabase/functions/_shared/wedding-schema-v1.1.json',
    ]) {
      expect(read(file)).toContain('domains/musicians.json#/properties/musicians');
    }
    for (const file of [
      'schema/domains/musicians.json',
      'supabase/functions/_shared/domains/musicians.json',
    ]) {
      expect(JSON.parse(read(file)).title).toBe('Musicians domain');
    }
  });
});
