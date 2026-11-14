import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #628 venueDetails removed from the main cartridge', () => {
  it('keeps the domain contract but removes the main schema property', () => {
    expect(json('schema/domains/venue-details.json').properties.venueDetails).toBeTruthy();
    expect(
      json('schema/wedding-schema-v1.1.json').properties.venueDetails,
    ).toBeUndefined();
  });

  it('does not emit venueDetails from the Google Doc mapper', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    expect(result.cartridge).not.toHaveProperty('venueDetails');
    expect(result.cartridge).not.toHaveProperty('venue');
    expect(result.cartridge).not.toHaveProperty('venueLogistics');
  });

  it('keeps demo and fixtures free of the field', () => {
    expect(read('src/demo/demoWedding.js')).not.toContain('venueDetails');
    expect(json('schema/wedding-cartridge.example.json')).not.toHaveProperty(
      'venueDetails',
    );
    expect(json('schema/fixtures/real-jennifer-guillaume.json')).not.toHaveProperty(
      'venueDetails',
    );
  });
});
