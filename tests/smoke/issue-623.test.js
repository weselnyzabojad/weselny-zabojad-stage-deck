import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import { sanitizeCartridge } from '../../src/lib/cartridgeImporter.js';
import { sanitizeCartridge as sanitizeServerCartridge } from '../../supabase/functions/_shared/cartridgeSemantics.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #623 venueDetails domain', () => {
  it('keeps the venueDetails domain contract', () => {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    expect(
      ajv.compile(json('schema/domains/venue-details.json'))(
        json('schema/domains/venue-details.example.json'),
      ),
    ).toBe(true);
    expect(read('supabase/functions/_shared/domains/venue-details.json')).toBe(
      read('schema/domains/venue-details.json'),
    );
  });

  it('does not carry venueDetails in the main cartridge schema or example', () => {
    const schema = json('schema/wedding-schema-v1.1.json');
    expect(schema.properties.venueDetails).toBeUndefined();
    expect(read('supabase/functions/_shared/wedding-schema-v1.1.json')).toBe(
      read('schema/wedding-schema-v1.1.json'),
    );
    for (const path of [
      'schema/wedding-cartridge.example.json',
      'schema/fixtures/real-jennifer-guillaume.json',
    ]) {
      expect(json(path)).not.toHaveProperty('venueDetails');
    }
  });

  it('drops legacy venue keys on the client and server before validation', async () => {
    const legacy = {
      ...json('schema/wedding-cartridge.example.json'),
      venue: 'Legacy Hall',
      venueLogistics: { timezone: 'Europe/Warsaw', address: '1 Old Road' },
    };

    for (const clean of [sanitizeCartridge(legacy), sanitizeServerCartridge(legacy)]) {
      expect(clean).not.toHaveProperty('venue');
      expect(clean).not.toHaveProperty('venueLogistics');
      expect(clean).not.toHaveProperty('venueDetails');
      expect(await validateCartridge(clean)).toEqual([]);
    }
  });
});
