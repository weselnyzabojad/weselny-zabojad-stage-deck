import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #565 photo-plan domain schema', () => {
  it('defines the domain schema and validates its example', () => {
    const domain = json('schema/domains/photo-plan.json');
    expect(domain.properties.photoPlan.required).toEqual(['sunset']);
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    expect(ajv.compile(domain)(json('schema/domains/photo-plan.example.json'))).toBe(true);
  });

  it('references the domain from the main schema', () => {
    const schema = json('schema/wedding-schema-v1.1.json');
    expect(schema.properties.photoPlan.$ref).toBe(
      'https://weselnyzabojad.example/schemas/domains/photo-plan.json#/properties/photoPlan',
    );
  });

  it('removes the photoPlan block from the cartridge example', () => {
    expect(json('schema/wedding-cartridge.example.json')).not.toHaveProperty('photoPlan');
  });
});
