import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../schema/validate-lib.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');

function importDoc(text) {
  return googleDocTemplateToCartridge(parseGoogleDocTemplate(text));
}

function replaceDemographics(block) {
  return template.replace(
    /## DEMOGRAPHICS[\s\S]*?(?=\n## )/,
    `## DEMOGRAPHICS\n\n${block}\n`,
  );
}

describe('issue #1250 Google Doc demographics contract', () => {
  it('maps the documented guest counts and note', async () => {
    const { cartridge, warnings } = importDoc(template);
    expect(cartridge.demographics).toEqual({
      total: 96,
      pl: 64,
      fr: 24,
      other: 8,
      notes: '12 children; two guests need vegetarian meals.',
    });
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('keeps a partial section partial instead of inventing zeroes', async () => {
    const { cartridge, warnings } = importDoc(
      replaceDemographics('Guests total: 80\nNotes: Small ceremony.'),
    );
    expect(cartridge.demographics).toEqual({
      total: 80,
      notes: 'Small ceremony.',
    });
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns and omits invalid counts', async () => {
    const { cartridge, warnings } = importDoc(
      replaceDemographics(
        'Guests total: -5\nGuests PL: 3.5\nGuests FR: abc\nGuests other: 7',
      ),
    );
    expect(cartridge.demographics).toEqual({ other: 7 });
    expect(warnings).toEqual([
      expect.stringContaining('"Guests total"'),
      expect.stringContaining('"Guests PL"'),
      expect.stringContaining('"Guests FR"'),
    ]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('keeps the legacy Privacy note as a fallback', async () => {
    const withoutDemographics = template.replace(
      /## DEMOGRAPHICS[\s\S]*?(?=\n## )/,
      '',
    );
    const legacy = withoutDemographics.replace(
      'Encryption version: 1',
      'Encryption version: 1\nDemographics notes: Legacy note.',
    );
    const { cartridge } = importDoc(legacy);
    expect(cartridge.demographics).toEqual({ notes: 'Legacy note.' });
  });

  it('documents the section and field-map status', () => {
    expect(template).toContain('## DEMOGRAPHICS');
    expect(template).toContain('Guests total:');
    expect(template).toContain('Guests PL:');
    expect(template).toContain('Guests FR:');
    expect(template).toContain('Guests other:');
    const fieldMap = JSON.parse(read('schema/google-doc-field-map.json'));
    expect(fieldMap.files['demographics.example.json']).toEqual({
      'demographics.total': 'optional',
      'demographics.pl': 'optional',
      'demographics.fr': 'optional',
      'demographics.other': 'optional',
      'demographics.notes': 'optional',
    });
  });
});
