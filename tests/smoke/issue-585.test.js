import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

const domain = json('schema/domains/demographics.json');
const example = json('schema/domains/demographics.example.json');
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(domain);

describe('issue #585 demographics domain schema', () => {
  it('defines the domain schema and validates its example', () => {
    expect(validate(example)).toBe(true);
  });

  it('references the domain from the main schema', () => {
    expect(json('schema/wedding-schema-v1.1.json').properties.demographics.$ref).toBe(
      'https://weselnyzabojad.example/schemas/domains/demographics.json#/properties/demographics',
    );
  });

  it('removes demographics from the cartridge example', () => {
    expect(json('schema/wedding-cartridge.example.json')).not.toHaveProperty('demographics');
  });

  it('rejects unknown keys', () => {
    const unknownKey = structuredClone(example);
    unknownKey.demographics.guests = 5;
    expect(validate(unknownKey)).toBe(false);
  });
});
