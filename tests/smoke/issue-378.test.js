import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { resolvePhotoPlan } from '../../src/lib/photoPlan.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #378 group-photo data alignment', () => {
  it('maps an explicit group-photo step id from the Google Doc', () => {
    const template = read('schema/google-doc-template.md').replace(
      'Group photos step ID:',
      'Group photos step ID: step_07',
    );
    const parsed = parseGoogleDocTemplate(template);
    const result = googleDocTemplateToCartridge(parsed);
    expect(result.cartridge.photoPlan.groupPhotos.stepId).toBe('step_07');
  });

  it('preserves group order and does not emit removed sizing fields', () => {
    const parsed = parseGoogleDocTemplate(read('schema/google-doc-template.md'));
    const result = googleDocTemplateToCartridge(parsed);
    const groupPhotos = result.cartridge.photoPlan.groupPhotos;
    expect(groupPhotos.groups.map((group) => group.label)).toEqual([
      "Bride's family",
      "Groom's family",
      'Friends',
    ]);
    expect(groupPhotos).not.toHaveProperty('minGroupSize');
    expect(groupPhotos).not.toHaveProperty('durationMin');
  });

  it('keeps the resolved plan free of duration and minimum-size gates', () => {
    const resolved = resolvePhotoPlan({
      photoPlan: {
        groupPhotos: {
          stepId: 'step_07',
          location: 'Garden',
          groups: [{ id: 'parents', label: 'Parents' }],
          minGroupSize: 5,
          durationMin: 25,
        },
      },
    });
    expect(resolved.groupPhotos).toEqual({
      stepId: 'step_07',
      location: 'Garden',
      groups: [{ id: 'parents', label: 'Parents' }],
    });
  });

  it('keeps the canonical and Edge schema copies byte-identical', () => {
    expect(read('supabase/functions/_shared/wedding-schema-v1.1.json')).toBe(
      read('schema/wedding-schema-v1.1.json'),
    );
  });
});
