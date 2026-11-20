import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../helpers/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #670 special-effects Google Doc source flags', () => {
  it('does not author special effects in the PHOTO PLAN section', () => {
    const photoPlan = template.slice(
      template.indexOf('## PHOTO PLAN'),
      template.indexOf('## IMPORTANT SONGS'),
    );
    expect(photoPlan).not.toContain('Sparklers:');
    expect(photoPlan).not.toContain('Fire:');
    expect(photoPlan).not.toContain('Heavy smoke:');
    expect(photoPlan).not.toContain('Other effects:');
    expect(photoPlan).not.toContain('approved');
  });

  it('does not map PHOTO PLAN effects from the Doc', async () => {
    const { cartridge, warnings } = parse();

    expect(cartridge.photoPlan.specialEffects).toBeUndefined();
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });
});
