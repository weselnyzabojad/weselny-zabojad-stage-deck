import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #662 demographics Google Doc source flags', () => {
  it('removes demographics.languages from every schema, example and fixture', () => {
    for (const path of [
      'schema/domains/demographics.json',
      'supabase/functions/_shared/domains/demographics.json',
    ]) {
      expect(json(path).properties.demographics.properties, path).not.toHaveProperty('languages');
    }
    for (const path of [
      'schema/domains/demographics.example.json',
      'schema/fixtures/real-jennifer-guillaume.json',
    ]) {
      expect(json(path).demographics, path).not.toHaveProperty('languages');
    }
    expect(json('schema/google-doc-field-map.json').files['demographics.example.json']).not.toHaveProperty(
      'demographics.languages',
    );
  });

  it('rejects a languages value now that the field is gone', () => {
    const cartridge = json('schema/fixtures/valid-minimal.json');
    cartridge.demographics = { languages: ['PL'] };
    return validateCartridge(cartridge).then((errors) => {
      expect(errors.some((error) => error.message.includes('additional properties'))).toBe(true);
    });
  });

  it('degrades the optional demographics values safely when the Doc omits them', async () => {
    const { cartridge, warnings } = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );

    expect(cartridge.demographics).toEqual({});
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });
});
