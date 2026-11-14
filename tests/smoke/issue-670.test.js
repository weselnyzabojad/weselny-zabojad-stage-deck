import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #670 special-effects Google Doc source flags', () => {
  it('keeps the required effect flags and drops approval lines', () => {
    expect(template).toContain('Sparklers: true');
    expect(template).toContain('Fire: false');
    expect(template).toContain('Heavy smoke: true');
    expect(template).toContain('Other effects: Cold sparks');
    expect(template).not.toContain('Sparklers approved');
    expect(template).not.toContain('Fire approved');
    expect(template).not.toContain('Heavy smoke approved');
    expect(template).not.toContain('Other effects approved');
  });

  it('maps the required flags and optional other effect', async () => {
    const { cartridge, warnings } = parse();

    expect(cartridge.photoPlan.specialEffects).toEqual({
      sparklers: true,
      fire: false,
      heavySmoke: true,
      other: 'Cold sparks',
    });
    expect(cartridge.photoPlan.specialEffects).not.toHaveProperty('approvals');
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns and defaults a missing required flag to false', async () => {
    const result = parse(template.replace('Heavy smoke: true', 'Heavy smoke: '));

    expect(result.warnings).toContain('SPECIAL EFFECTS: missing Heavy smoke');
    expect(result.cartridge.photoPlan.specialEffects.heavySmoke).toBe(false);
    expect(await validateCartridge(result.cartridge)).toEqual([]);
  });

  it('omits the optional other effect safely', async () => {
    const { cartridge, warnings } = parse(
      template.replace('Other effects: Cold sparks', 'Other effects: '),
    );

    expect(cartridge.photoPlan.specialEffects).not.toHaveProperty('other');
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });
});
