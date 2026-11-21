import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GroupPhotoChecklist from '../../src/components/GroupPhotoChecklist.jsx';
import { sanitizeCartridge } from '../../src/lib/cartridgeImporter.js';
import {
  GROUP_PHOTO_ALL_GUESTS_KEY,
  buildGroupPhotoItems,
} from '../../src/lib/groupPhotoChecklist.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../helpers/googleDocCartridge.js';
import { sanitizeCartridge as sanitizeServerCartridge } from '../../supabase/functions/_shared/cartridgeSemantics.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

const sanitizers = [sanitizeCartridge, sanitizeServerCartridge];

describe('issue #945 guest coverage merged into group photos', () => {
  it('migrates a cartridge with only guest coverage into group photos', () => {
    for (const sanitize of sanitizers) {
      const clean = sanitize({
        photoPlan: {
          guestCoverage: {
            allGuests: false,
            description: 'Formal photos with immediate family and witnesses only.',
            groups: [
              { id: 'immediate_family', label: 'Immediate family' },
              { id: 'witnesses', label: 'Witnesses' },
            ],
          },
        },
      });

      expect(clean.photoPlan).not.toHaveProperty('guestCoverage');
      expect(clean.photoPlan.groupPhotos).toEqual({
        description: 'Formal photos with immediate family and witnesses only.',
        groups: [
          { id: 'immediate_family', label: 'Immediate family' },
          { id: 'witnesses', label: 'Witnesses' },
        ],
      });
      expect(clean.photoPlan.groupPhotos).not.toHaveProperty('allGuests');
    }
  });

  it('keeps groupPhotos order and deduplicates by id then normalized label', () => {
    for (const sanitize of sanitizers) {
      const clean = sanitize({
        photoPlan: {
          groupPhotos: {
            stepId: 'step_07',
            location: 'Garden',
            description: 'Existing group-photo description.',
            groups: [
              { id: 'friends', label: 'Friends' },
              { id: 'family', label: 'Family' },
            ],
          },
          guestCoverage: {
            allGuests: false,
            description: 'Guest coverage description.',
            groups: [
              { id: 'family', label: 'Family duplicate' },
              { id: 'immediate_family', label: 'Friends' },
              { id: 'witnesses', label: 'Witnesses' },
              { id: 'witnesses', label: 'Witnesses duplicate' },
              { id: 'parents', label: '  PARENTS  ' },
            ],
          },
        },
      });

      expect(clean.photoPlan).not.toHaveProperty('guestCoverage');
      expect(clean.photoPlan.groupPhotos).toMatchObject({
        stepId: 'step_07',
        location: 'Garden',
        description: 'Existing group-photo description.',
      });
      expect(clean.photoPlan.groupPhotos.groups).toEqual([
        { id: 'friends', label: 'Friends' },
        { id: 'family', label: 'Family' },
        { id: 'witnesses', label: 'Witnesses' },
        { id: 'parents', label: 'PARENTS' },
      ]);
    }
  });

  it('falls back to the guest-coverage description and is idempotent', () => {
    for (const sanitize of sanitizers) {
      const legacy = {
        photoPlan: {
          groupPhotos: {
            location: 'Garden',
            groups: [{ id: 'friends', label: 'Friends' }],
          },
          guestCoverage: {
            description: 'Guest coverage description.',
            groups: [{ id: 'friends', label: 'Friends' }],
          },
        },
      };

      const once = sanitize(legacy);
      const twice = sanitize(once);

      expect(once.photoPlan.groupPhotos.description).toBe('Guest coverage description.');
      expect(twice).toEqual(once);
      expect(twice.photoPlan.groupPhotos.groups).toEqual([
        { id: 'friends', label: 'Friends' },
      ]);
    }
  });

  it('removes guest coverage from the schema while keeping group-photo description', () => {
    const schema = json('schema/wedding-schema-v1.1.json');
    const photoPlanDomain = json('schema/domains/photo-plan.json');
    const groupPhotosDomain = json('schema/domains/group-photos.json');
    expect(photoPlanDomain.properties.photoPlan.properties.guestCoverage).toBeUndefined();
    expect(schema.$defs.photoPlan.properties.guestCoverage).toBeUndefined();
    expect(groupPhotosDomain.properties.groupPhotos.properties.description).toEqual({
      type: 'string',
    });
    expect(read('supabase/functions/_shared/wedding-schema-v1.1.json')).toBe(
      read('schema/wedding-schema-v1.1.json'),
    );
    expect(read('supabase/functions/_shared/domains/group-photos.json')).toBe(
      read('schema/domains/group-photos.json'),
    );
    expect(read('supabase/functions/_shared/domains/photo-plan.json')).toBe(
      read('schema/domains/photo-plan.json'),
    );
  });

  it('removes guest-coverage keys from the Google Doc contract and maps the description', () => {
    const template = read('schema/google-doc-template.md');
    const fieldMap = json('schema/google-doc-field-map.json');
    expect(template).not.toMatch(/Guest coverage/i);
    expect(template).toContain('| Group photos description |');
    expect(fieldMap.files['guest-coverage.example.json']).toBeUndefined();
    expect(fieldMap.files['group-photos.example.json']['groupPhotos.description']).toBe(
      'optional',
    );

    const { cartridge } = googleDocTemplateToCartridge(parseGoogleDocTemplate(template));
    expect(cartridge.photoPlan).not.toHaveProperty('guestCoverage');
    expect(cartridge.photoPlan.groupPhotos.description).toBe(
      'Formal photos with immediate family and witnesses only.',
    );
  });

  it('renders the merged description in the checklist and keeps the all-guest row mandatory', () => {
    const html = renderToStaticMarkup(
      createElement(GroupPhotoChecklist, {
        groups: [{ id: 'witnesses', label: 'Witnesses' }],
        description: 'Formal photos with immediate family and witnesses only.',
      }),
    );

    expect(html).toContain('Formal photos with immediate family and witnesses only.');
    expect(html).toContain('All guests + newlyweds');
    const items = buildGroupPhotoItems([]);
    expect(items.find((item) => item.key === GROUP_PHOTO_ALL_GUESTS_KEY)?.required).toBe(true);
  });

  it('removes the separate Photographer guest-coverage block', () => {
    const photo = read('src/components/PhotographerView.jsx');
    const mc = read('src/views/McMasterView.jsx');
    expect(photo).not.toMatch(/Guest coverage/i);
    expect(photo).toContain('description={groupEntry.data.description}');
    expect(mc).toContain('description={photoPlan.groupPhotos.description}');
  });
});
