import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #575 group-photos domain schema after guest-coverage merge', () => {
  it('removes the separate guest-coverage domain and photo-plan reference', () => {
    expect(existsSync(new URL('../../schema/domains/guest-coverage.json', import.meta.url))).toBe(
      false,
    );
    expect(
      existsSync(new URL('../../schema/domains/guest-coverage.example.json', import.meta.url)),
    ).toBe(false);
    const photoPlan = json('schema/domains/photo-plan.json');
    expect(photoPlan.properties.photoPlan.properties.guestCoverage).toBeUndefined();
    expect(photoPlan.properties.photoPlan.properties.groupPhotos.$ref).toBe(
      'https://weselnyzabojad.example/schemas/domains/group-photos.json#/properties/groupPhotos',
    );
  });

  it('carries the optional description in the group-photos domain and example', () => {
    const domain = json('schema/domains/group-photos.json');
    expect(domain.properties.groupPhotos.properties.description).toEqual({ type: 'string' });
    expect(domain.properties.groupPhotos.properties.groups.items.required).toEqual([
      'id',
      'label',
    ]);
    const example = json('schema/domains/group-photos.example.json');
    expect(example.groupPhotos.description).toBe(
      'Formal photos with immediate family and witnesses only.',
    );
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    expect(ajv.compile(domain)(example)).toBe(true);
  });

  it('removes guestCoverage from the photo-plan example', () => {
    expect(json('schema/domains/photo-plan.example.json').photoPlan).not.toHaveProperty(
      'guestCoverage',
    );
  });
});
