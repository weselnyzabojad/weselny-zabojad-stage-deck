import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #641 witness responsibilities cleanup', () => {
  it('removes responsibilities from the domain and example', () => {
    const domain = json('schema/domains/witnesses.json');
    expect(domain.$defs.witness.properties.responsibilities).toBeUndefined();
    expect(domain.$defs.responsibility).toBeUndefined();
    for (const witness of json('schema/domains/witnesses.example.json').witnesses) {
      expect(witness).not.toHaveProperty('responsibilities');
    }
  });

  it('keeps identity, contact and speech links', () => {
    const example = json('schema/domains/witnesses.example.json').witnesses;
    expect(example[0].name).toBe('Zuzia');
    expect(example[0].contact.phone).toBeTruthy();
    expect(example[0].speechIds).toEqual(['speech_witness']);
    expect(example[1].language).toBe('FR');
  });

  it('no longer maps the responsibilities column', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    expect(result.cartridge.witnesses).toHaveLength(2);
    expect(result.cartridge.witnesses[0]).not.toHaveProperty('responsibilities');
    expect(result.cartridge.witnesses[0]).not.toHaveProperty('speechIds');
    expect(read('schema/google-doc-template.md')).not.toContain('Responsibilities');
    expect(read('src/demo/demoWedding.js')).not.toContain('responsibilities');
  });
});
