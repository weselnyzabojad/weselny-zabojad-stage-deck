import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolvePhotoPlan } from '../../src/lib/photoPlan.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #633 guest coverage groups', () => {
  it('removes selectedGuests/consent and adds groups[]', () => {
    const domain = json('schema/domains/guest-coverage.json');
    const coverage = domain.properties.guestCoverage;
    expect(coverage.properties.selectedGuests).toBeUndefined();
    expect(coverage.properties.consent).toBeUndefined();
    expect(coverage.properties.groups.type).toBe('array');
    expect(coverage.properties.groups.items.required).toEqual(['id', 'label']);
  });

  it('updates examples, demo and fixture', () => {
    for (const path of [
      'schema/domains/guest-coverage.example.json',
      'schema/fixtures/real-jennifer-guillaume.json',
    ]) {
      const doc = json(path);
      const coverage = doc.guestCoverage ?? doc.photoPlan?.guestCoverage;
      expect(coverage).not.toHaveProperty('selectedGuests');
      expect(coverage).not.toHaveProperty('consent');
      expect(coverage.groups.length).toBeGreaterThan(0);
    }
    expect(read('src/demo/demoWedding.js')).not.toContain('selectedGuests');
    expect(read('src/demo/demoWedding.js')).not.toContain(
      'Couple approved; announce before candid coverage.',
    );
  });

  it('resolves groups for the photographer view', () => {
    const plan = resolvePhotoPlan(json('schema/fixtures/real-jennifer-guillaume.json'));
    expect(plan.guestCoverage.groups).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'witnesses' })]),
    );
  });

  it('maps the Google Doc group list', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    expect(result.cartridge.photoPlan.guestCoverage.groups).toEqual([
      { id: 'immediate_family', label: 'Immediate family' },
      { id: 'witnesses', label: 'Witnesses' },
    ]);
  });
});
