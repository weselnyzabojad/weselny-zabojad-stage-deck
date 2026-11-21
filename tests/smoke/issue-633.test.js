import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolvePhotoPlan } from '../../src/lib/photoPlan.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../helpers/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #633 guest coverage groups after the group-photo merge', () => {
  it('keeps the former coverage groups in the merged fixture', () => {
    const fixture = json('schema/fixtures/real-jennifer-guillaume.json');
    expect(fixture.photoPlan).not.toHaveProperty('guestCoverage');
    expect(fixture.photoPlan.groupPhotos.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'immediate_family' }),
        expect.objectContaining({ id: 'witnesses' }),
      ]),
    );
    expect(read('src/demo/demoWedding.js')).not.toContain('guestCoverage');
  });

  it('resolves merged groups for the photographer view', () => {
    const plan = resolvePhotoPlan(json('schema/fixtures/real-jennifer-guillaume.json'));
    expect(plan).not.toHaveProperty('guestCoverage');
    expect(plan.groupPhotos.groups).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'witnesses' })]),
    );
  });

  it('maps the Google Doc group list and description into group photos', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    expect(result.cartridge.photoPlan).not.toHaveProperty('guestCoverage');
    expect(result.cartridge.photoPlan.groupPhotos).toMatchObject({
      description: 'Formal photos with immediate family and witnesses only.',
      groups: [
        { id: 'bride_s_family', label: "Bride's family" },
        { id: 'groom_s_family', label: "Groom's family" },
        { id: 'friends', label: 'Friends' },
      ],
    });
  });
});
