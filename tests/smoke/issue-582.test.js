import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #582 cake domain schema', () => {
  it('defines the domain schema and validates its example', () => {
    const domain = json('schema/domains/cake.json');
    expect(domain.properties.cake.properties.cuttingSong.minLength).toBe(1);
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    expect(ajv.compile(domain)(json('schema/domains/cake.example.json'))).toBe(true);
  });

  it('references the domain from the main schema', () => {
    const schema = json('schema/wedding-schema-v1.1.json');
    expect(schema.properties.cake.$ref).toBe(
      'https://weselnyzabojad.example/schemas/domains/cake.json#/properties/cake',
    );
  });

  it('removes cake from the cartridge example', () => {
    expect(json('schema/wedding-cartridge.example.json')).not.toHaveProperty('cake');
  });
});
