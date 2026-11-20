import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #576 special-effects domain schema', () => {
  it('defines the domain schema and validates its example', () => {
    const domain = json('schema/domains/special-effects.json');
    expect(domain.properties.specialEffects.properties.fire.type).toBe('boolean');
    expect(domain.properties.specialEffects.properties.approvals.type).toBe('object');
    expect(domain.properties.specialEffects.properties.permitRequired).toBeUndefined();
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    expect(ajv.compile(domain)(json('schema/domains/special-effects.example.json'))).toBe(true);
  });

  it('references the domain from photo-plan.json', () => {
    const photoPlan = json('schema/domains/photo-plan.json');
    expect(photoPlan.properties.photoPlan.properties.specialEffects.$ref).toBe(
      'https://weselnyzabojad.example/schemas/domains/special-effects.json#/properties/specialEffects',
    );
  });

  it('removes specialEffects from the photo-plan example', () => {
    expect(json('schema/domains/photo-plan.example.json').photoPlan).not.toHaveProperty(
      'specialEffects',
    );
  });
});
