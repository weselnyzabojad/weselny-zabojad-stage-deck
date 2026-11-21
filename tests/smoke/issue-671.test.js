import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../helpers/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #671 speeches Google Doc source flags', () => {
  it('removes the deleted fields from schema, example and fixtures', () => {
    const schema = json('schema/domains/speeches.json').$defs.speech.properties;
    for (const field of ['time', 'language', 'delivery', 'mcIntro']) {
      expect(schema[field], field).toBeUndefined();
    }
    expect(schema.consent.properties.storeScript).toBeUndefined();
    expect(schema.consent.properties.confirmedAt).toBeUndefined();

    for (const path of ['schema/domains/speeches.example.json']) {
      for (const speech of json(path).speeches) {
        for (const field of ['time', 'language', 'delivery', 'mcIntro', 'consent']) {
          expect(speech, `${path} ${field}`).not.toHaveProperty(field);
        }
      }
    }
    for (const path of [
      'schema/fixtures/real-jennifer-guillaume.json',
      'schema/fixtures/valid-speeches.json',
    ]) {
      expect(json(path)).not.toHaveProperty('speeches');
    }
    expect(read('src/demo/demoWedding.js')).not.toContain('mcIntro');
  });

  it('keeps only the required Doc columns and removes the script block', () => {
    const speeches = template.slice(
      template.indexOf('## SPEECHES'),
      template.indexOf('## CAKE'),
    );
    expect(speeches).toContain('| Order | Speaker | Relationship |');
    expect(speeches).not.toContain('| Speech ID |');
    expect(speeches).not.toContain('### Speech Script');
    for (const column of ['Time', 'Language', 'Delivery', 'Consent', 'Visible roles']) {
      expect(speeches, column).not.toContain(`| ${column}`);
    }
  });

  it('creates speech records in the cartridge', async () => {
    const { cartridge, warnings } = parse();

    expect(cartridge.speeches).toEqual([
      {
        id: 'bartek',
        order: 1,
        speaker: { name: 'Bartek', relationship: 'Best man' },
      },
    ]);
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('skips an incomplete row without inventing a record', () => {
    const result = parse(template.replace('| 1 | Bartek | Best man |', '| 1 |  | Best man |'));

    expect(result.warnings).toContain('SPEECHES row skipped: missing Speaker');
    expect(result.cartridge.speeches ?? []).toEqual([]);
  });
});
