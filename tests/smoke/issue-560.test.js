import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #560 oczepiny domain schema', () => {
  it('defines the domain schema and validates its example', () => {
    const domain = json('schema/domains/oczepiny.json');
    expect(domain.$id).toContain('/domains/oczepiny.json');
    expect(domain.properties.oczepiny.properties.variant.enum).toEqual(['EARLY', 'MIDNIGHT']);

    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const validate = ajv.compile(domain);
    expect(validate(json('schema/domains/oczepiny.example.json'))).toBe(true);
  });

  it('references the domain from the main schema', () => {
    const schema = json('schema/wedding-schema-v1.1.json');
    expect(schema.$defs.oczepiny.$ref).toBe(
      'https://weselnyzabojad.example/schemas/domains/oczepiny.json#/properties/oczepiny',
    );
  });

  it('removes the oczepiny block from the cartridge example', () => {
    const example = json('schema/wedding-cartridge.example.json');
    expect(example).not.toHaveProperty('oczepiny');
  });
});
