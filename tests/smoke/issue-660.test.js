import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #660 couple-profile Google Doc source flags', () => {
  it('keeps every required couple value in the template', () => {
    for (const label of [
      'Bride first name',
      'Bride nationality',
      'Groom first name',
      'Groom nationality',
      'Shared languages',
    ]) {
      expect(template, label).toContain(`${label}:`);
    }
  });

  it('maps the required couple fields', async () => {
    const { cartridge, errors } = parse();

    expect(errors).toEqual([]);
    expect(cartridge.coupleProfile).toEqual({
      bride: { firstName: 'Jennifer', nationalities: ['FR'] },
      groom: { firstName: 'Guillaume', nationalities: ['FR'] },
      commonLanguages: ['FR', 'PL', 'EN'],
    });
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns when a required nationality or language value is missing', () => {
    for (const [label, warning] of [
      ['Bride nationality', 'missing Bride nationality'],
      ['Groom nationality', 'missing Groom nationality'],
      ['Shared languages', 'missing Shared languages'],
    ]) {
      const source = template.replace(`${label}:${template.split(`${label}:`)[1].split('\n')[0]}`, `${label}: `);
      const result = parse(source);
      expect(result.warnings, label).toContain(`COUPLE IDENTITY: ${warning}`);
      expect(result.errors).toEqual([]);
    }
  });
});
