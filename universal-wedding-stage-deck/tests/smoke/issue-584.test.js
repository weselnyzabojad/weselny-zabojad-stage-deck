import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

const domain = json('schema/domains/music-policy.json');
const example = json('schema/domains/music-policy.example.json');
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(domain);

describe('issue #584 musicPolicy domain schema', () => {
  it('defines the domain schema and validates its example', () => {
    expect(validate(example)).toBe(true);
  });

  it('references the domain from the main schema', () => {
    expect(json('schema/wedding-schema-v1.1.json').properties.musicPolicy.$ref).toBe(
      'https://weselnyzabojad.example/schemas/domains/music-policy.json#/properties/musicPolicy',
    );
  });

  it('removes musicPolicy from the cartridge example', () => {
    expect(json('schema/wedding-cartridge.example.json')).not.toHaveProperty('musicPolicy');
  });

  it('keeps discoPoloPolicy and the request window validated', () => {
    const invalidPolicy = structuredClone(example);
    invalidPolicy.musicPolicy.discoPoloPolicy = 'MAYBE';
    expect(validate(invalidPolicy)).toBe(false);

    const incompleteWindow = structuredClone(example);
    delete incompleteWindow.musicPolicy.requestWindow.end;
    expect(validate(incompleteWindow)).toBe(false);
  });
});
