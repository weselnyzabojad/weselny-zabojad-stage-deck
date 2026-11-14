import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
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

    for (const path of [
      'schema/domains/speeches.example.json',
      'schema/fixtures/real-jennifer-guillaume.json',
      'schema/fixtures/valid-speeches.json',
    ]) {
      for (const speech of json(path).speeches) {
        for (const field of ['time', 'language', 'delivery', 'mcIntro', 'consent']) {
          expect(speech, `${path} ${field}`).not.toHaveProperty(field);
        }
      }
    }
    expect(read('src/demo/demoWedding.js')).not.toContain('mcIntro');
  });

  it('keeps only the required Doc columns and the separate script', () => {
    const speeches = template.slice(
      template.indexOf('## SPEECHES'),
      template.indexOf('## CAKE'),
    );
    expect(speeches).toContain('| Speech ID | Order | Speaker | Relationship |');
    for (const column of ['Time', 'Language', 'Delivery', 'Consent', 'Visible roles']) {
      expect(speeches, column).not.toContain(`| ${column}`);
    }
    expect(speeches).toContain('### Speech Script speech_witness');
  });

  it('maps the required values and the separate script text', async () => {
    const { cartridge, warnings } = parse();
    const [speech] = cartridge.speeches;

    expect(speech).toMatchObject({
      id: 'speech_witness',
      speaker: { name: 'Bartek', relationship: 'Best man' },
      order: 1,
      script: { format: 'PLAIN', ready: true, source: 'GOOGLE_DOC' },
    });
    expect(speech.script.text).toContain('Drodzy');
    expect(speech).not.toHaveProperty('time');
    expect(speech).not.toHaveProperty('language');
    expect(speech).not.toHaveProperty('delivery');
    expect(speech).not.toHaveProperty('consent');
    expect(speech).not.toHaveProperty('visibleToRoles');
    expect(speech).not.toHaveProperty('mcIntro');
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns and skips a row missing a required Doc value', () => {
    const result = parse(
      template.replace(
        '| speech_witness | 1 | Bartek | Best man |',
        '| speech_witness | 1 |  | Best man |',
      ),
    );

    expect(result.warnings).toContain('SPEECHES row skipped: missing Speaker');
    expect(result.cartridge.speeches).toEqual([]);
  });
});
