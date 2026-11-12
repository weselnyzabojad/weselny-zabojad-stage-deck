import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #553 witnesses as key persons', () => {
  it('defines the witnesses domain and validates its example', () => {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    expect(
      ajv.compile(json('schema/domains/witnesses.json'))(
        json('schema/domains/witnesses.example.json'),
      ),
    ).toBe(true);
  });

  it('references the domain from the browser, Node and Edge schemas', () => {
    const schema = json('schema/wedding-schema-v1.1.json');
    expect(schema.properties.witnesses.$ref).toBe(
      'https://weselnyzabojad.example/schemas/domains/witnesses.json#/properties/witnesses',
    );
    expect(read('supabase/functions/_shared/wedding-schema-v1.1.json')).toBe(
      read('schema/wedding-schema-v1.1.json'),
    );
    expect(read('supabase/functions/_shared/domains/witnesses.json')).toBe(
      read('schema/domains/witnesses.json'),
    );
  });

  it('maps the Google Doc witnesses table and links speeches by id', async () => {
    const parsed = parseGoogleDocTemplate(read('schema/google-doc-template.md'));
    const result = googleDocTemplateToCartridge(parsed);
    expect(result.errors).toEqual([]);
    expect(result.cartridge.witnesses).toHaveLength(2);
    expect(result.cartridge.witnesses[0]).toMatchObject({
      id: 'witness_bartek',
      name: 'Bartek',
      language: 'PL',
    });
    expect(result.cartridge.witnesses[0]).not.toHaveProperty('role');
    expect(result.cartridge.witnesses[0]).not.toHaveProperty('speechIds');
    expect(result.cartridge.witnesses[0].contact).toEqual({
      phone: '+48 600 222 333',
      email: 'bartek@example.com',
    });
    expect(await validateCartridge(result.cartridge)).toEqual([]);
  });

  it('rejects a witness link to an unknown speech id', async () => {
    const cartridge = json('schema/wedding-cartridge.example.json');
    cartridge.witnesses = [
      {
        id: 'witness_test',
        name: 'Test Witness',
        speechIds: ['missing_speech'],
      },
    ];
    const errors = await validateCartridge(cartridge);
    expect(errors).toContainEqual({
      location: '/witnesses/0/speechIds/0',
      message: 'unknown speech id "missing_speech"',
    });
  });
});
