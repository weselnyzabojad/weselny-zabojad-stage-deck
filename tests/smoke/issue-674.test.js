import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #674 witnesses Google Doc source flags', () => {
  it('removes role from the domain, example and map', () => {
    const witness = json('schema/domains/witnesses.json').$defs.witness;
    expect(witness.properties.role).toBeUndefined();
    expect(witness.required).toEqual(['id', 'name']);
    for (const witnessEntry of json('schema/domains/witnesses.example.json').witnesses) {
      expect(witnessEntry).not.toHaveProperty('role');
    }
    expect(
      json('schema/google-doc-field-map.json').files['witnesses.example.json'],
    ).not.toHaveProperty('witnesses[].role');
    expect(read('src/demo/demoWedding.js')).not.toContain('role: "Best man"');
  });

  it('keeps the required name/language and optional contact columns', () => {
    expect(template).toContain('| Witness ID | Name | Language | Phone | Email |');
    const witnesses = template.slice(template.indexOf('## WITNESSES'));
    expect(witnesses).not.toContain('| Role |');
    expect(witnesses).not.toContain('Speech IDs | Notes');
  });

  it('maps the required values and optional contact', async () => {
    const { cartridge, warnings } = parse();

    expect(cartridge.witnesses).toEqual([
      {
        id: 'witness_bartek',
        name: 'Bartek',
        language: 'PL',
        contact: { phone: '+48 600 222 333', email: 'bartek@example.com' },
      },
      { id: 'witness_valentin', name: 'Valentin', language: 'FR' },
    ]);
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns and skips a row missing a required Doc value', () => {
    const result = parse(
      template.replace('| witness_bartek | Bartek | PL |', '| witness_bartek |  | PL |'),
    );

    expect(result.warnings).toContain('WITNESSES row skipped: missing Name');
    expect(result.cartridge.witnesses.map((witness) => witness.id)).toEqual(['witness_valentin']);
  });
});
