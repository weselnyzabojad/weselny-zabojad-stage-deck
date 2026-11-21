import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../helpers/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #632 cultural rule note cleanup', () => {
  it('removes notes from Sto Lat and Gorzko but keeps the Bread & Salt note', () => {
    const schema = json('schema/domains/cultural-rules.json');
    expect(schema.properties.culturalRules.properties.sto_lat.properties.note).toBeUndefined();
    expect(schema.properties.culturalRules.properties.gorzko.properties.note).toBeUndefined();
    expect(schema.properties.culturalRules.properties.bread_salt.properties.note).toBeTruthy();
  });

  it('removes the notes from examples, demo and fixtures', () => {
    for (const path of [
      'schema/domains/cultural-rules.example.json',
      'schema/fixtures/real-jennifer-guillaume.json',
      'schema/wedding-cartridge.example.json',
    ]) {
      const rules = json(path).culturalRules;
      if (!rules) continue;
      expect(rules.sto_lat).not.toHaveProperty('note');
      expect(rules.gorzko).not.toHaveProperty('note');
    }
    expect(read('src/demo/demoWedding.js')).not.toContain(
      'Inform guests: NO Sto Lat tonight!',
    );
    expect(read('src/demo/demoWedding.js')).not.toContain('No Gorzko Gorzko');
  });

  it('maps only the Bread & Salt Example cell when the couple fills it', () => {
    const source = read('schema/google-doc-template.md').replace(
      '| breadSalt | YES |  |',
      '| breadSalt | YES | Vodka vs water shot; break glasses. |',
    );
    const result = googleDocTemplateToCartridge(parseGoogleDocTemplate(source));
    const rules = result.cartridge.culturalRules;
    expect(rules.sto_lat).not.toHaveProperty('note');
    expect(rules.gorzko).not.toHaveProperty('note');
    expect(rules.bread_salt.note).toBe('Vodka vs water shot; break glasses.');
  });
});
