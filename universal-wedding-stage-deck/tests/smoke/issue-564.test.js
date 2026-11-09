import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #564 couple-profile domain schema', () => {
  it('defines the domain schema and validates its example', () => {
    const domain = json('schema/domains/couple-profile.json');
    expect(domain.properties.coupleProfile.required).toEqual([
      'bride',
      'groom',
      'commonLanguages',
    ]);
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    expect(ajv.compile(domain)(json('schema/domains/couple-profile.example.json'))).toBe(true);
  });

  it('references the domain from the main schema', () => {
    const schema = json('schema/wedding-schema-v1.1.json');
    expect(schema.properties.coupleProfile.$ref).toBe(
      'https://weselnyzabojad.example/schemas/domains/couple-profile.json#/properties/coupleProfile',
    );
  });

  it('removes the coupleProfile block from the cartridge example', () => {
    expect(json('schema/wedding-cartridge.example.json')).not.toHaveProperty('coupleProfile');
  });
});
