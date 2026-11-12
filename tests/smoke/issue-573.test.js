import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #573 group-photos domain schema', () => {
  it('defines the domain schema and validates its example', () => {
    const domain = json('schema/domains/group-photos.json');
    expect(domain.properties.groupPhotos.properties.groups.items.required).toEqual([
      'id',
      'label',
    ]);
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    expect(ajv.compile(domain)(json('schema/domains/group-photos.example.json'))).toBe(true);
  });

  it('references the domain from photo-plan.json', () => {
    const photoPlan = json('schema/domains/photo-plan.json');
    expect(photoPlan.properties.photoPlan.properties.groupPhotos.$ref).toBe(
      'https://weselnyzabojad.example/schemas/domains/group-photos.json#/properties/groupPhotos',
    );
  });

  it('removes groupPhotos from the photo-plan example', () => {
    expect(json('schema/domains/photo-plan.example.json').photoPlan).not.toHaveProperty(
      'groupPhotos',
    );
  });
});
