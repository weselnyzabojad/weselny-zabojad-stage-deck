import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import { sanitizeCartridge } from '../../src/lib/cartridgeImporter.js';
import { sanitizeCartridge as sanitizeServerCartridge } from '../../supabase/functions/_shared/cartridgeSemantics.js';
import { resolveVenueTimeZone } from '../../src/lib/eventTime.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #623 venueDetails domain', () => {
  it('defines and validates the venueDetails domain example', () => {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    expect(
      ajv.compile(json('schema/domains/venue-details.json'))(
        json('schema/domains/venue-details.example.json'),
      ),
    ).toBe(true);
  });

  it('replaces the top-level venue and venueLogistics fields', () => {
    const schema = json('schema/wedding-schema-v1.1.json');
    expect(schema.properties.venue).toBeUndefined();
    expect(schema.properties.venueLogistics).toBeUndefined();
    expect(schema.$defs.venueLogistics).toBeUndefined();
    expect(schema.properties.venueDetails.$ref).toBe(
      'https://weselnyzabojad.example/schemas/domains/venue-details.json#/properties/venueDetails',
    );
    for (const path of [
      'schema/wedding-cartridge.example.json',
      'schema/fixtures/real-jennifer-guillaume.json',
    ]) {
      const cartridge = json(path);
      expect(cartridge).not.toHaveProperty('venue');
      expect(cartridge).not.toHaveProperty('venueLogistics');
      expect(typeof cartridge.venueDetails.venue).toBe('string');
    }
  });

  it('migrates legacy venue data on the client and server', async () => {
    const legacy = {
      ...json('schema/wedding-cartridge.example.json'),
      venue: 'Legacy Hall',
      venueLogistics: { timezone: 'Europe/Warsaw', address: '1 Old Road' },
    };
    delete legacy.venueDetails;

    for (const clean of [sanitizeCartridge(legacy), sanitizeServerCartridge(legacy)]) {
      expect(clean).not.toHaveProperty('venue');
      expect(clean).not.toHaveProperty('venueLogistics');
      expect(clean.venueDetails).toMatchObject({
        venue: 'Legacy Hall',
        timezone: 'Europe/Warsaw',
        address: '1 Old Road',
      });
      expect(await validateCartridge(clean)).toEqual([]);
    }
  });

  it('keeps timezone readers on venueDetails', () => {
    expect(
      resolveVenueTimeZone({
        venueDetails: { timezone: 'Europe/Warsaw' },
      }),
    ).toBe('Europe/Warsaw');
    expect(read('src/lib/eventTime.js')).not.toContain('venueLogistics');
    expect(read('src/lib/photoPlan.js')).not.toContain('venueLogistics');
  });

  it('maps the Google Doc venue name into venueDetails', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    expect(result.cartridge).not.toHaveProperty('venue');
    expect(result.cartridge).not.toHaveProperty('venueLogistics');
    expect(result.cartridge.venueDetails.venue).toContain('Dwór X');
    expect(result.cartridge.venueDetails.timezone).toBe('Europe/Warsaw');
  });

  it('keeps the Edge domain mirror byte-identical', () => {
    expect(read('supabase/functions/_shared/domains/venue-details.json')).toBe(
      read('schema/domains/venue-details.json'),
    );
    expect(read('supabase/functions/_shared/wedding-schema-v1.1.json')).toBe(
      read('schema/wedding-schema-v1.1.json'),
    );
  });
});
