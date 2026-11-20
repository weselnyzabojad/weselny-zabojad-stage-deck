import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #562 attractions domain schema', () => {
  it('defines the domain schema and validates its example', () => {
    const domain = json('schema/domains/attractions.json');
    expect(domain.properties.attractions.items.required).toContain('startTime');
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    expect(ajv.compile(domain)(json('schema/domains/attractions.example.json'))).toBe(true);
  });

  it('references the domain from the main schema', () => {
    const schema = json('schema/wedding-schema-v1.1.json');
    expect(schema.properties.attractions.$ref).toBe(
      'https://weselnyzabojad.example/schemas/domains/attractions.json#/properties/attractions',
    );
  });

  it('removes the attractions block from the cartridge example', () => {
    expect(json('schema/wedding-cartridge.example.json')).not.toHaveProperty('attractions');
  });
});
