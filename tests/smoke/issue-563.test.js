import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #563 cultural-rules domain schema', () => {
  it('defines the domain schema and validates its example', () => {
    const domain = json('schema/domains/cultural-rules.json');
    expect(domain.properties.culturalRules.required).toEqual([
      'sto_lat',
      'gorzko',
      'bread_salt',
    ]);
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    expect(ajv.compile(domain)(json('schema/domains/cultural-rules.example.json'))).toBe(true);
  });

  it('references the domain and makes culturalRules optional', () => {
    const schema = json('schema/wedding-schema-v1.1.json');
    expect(schema.properties.culturalRules.$ref).toBe(
      'https://weselnyzabojad.example/schemas/domains/cultural-rules.json#/properties/culturalRules',
    );
    expect(schema.required).not.toContain('culturalRules');
  });

  it('removes the culturalRules block from the cartridge example', () => {
    expect(json('schema/wedding-cartridge.example.json')).not.toHaveProperty('culturalRules');
  });
});
