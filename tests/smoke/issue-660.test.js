import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../helpers/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #660 couple-profile Google Doc source flags', () => {
  it('keeps the per-person identity tables in the template', () => {
    expect(template).toContain('### Bride');
    expect(template).toContain('### Groom');
    expect(template.match(/\| Nationality \|/g)).toHaveLength(2);
    expect(template.match(/\| Spoken languages \|/g)).toHaveLength(2);
    expect(template).not.toContain('| Bride first name |');
    expect(template).not.toContain('| Shared languages |');
  });

  it('maps the required couple fields and computes shared languages', async () => {
    const { cartridge, errors } = parse();

    expect(errors).toEqual([]);
    expect(cartridge.coupleProfile).toEqual({
      bride: {
        firstName: 'Jennifer',
        nationalities: ['FR'],
        spokenLanguages: ['FR', 'PL', 'EN'],
      },
      groom: {
        firstName: 'Guillaume',
        nationalities: ['FR'],
        spokenLanguages: ['FR', 'PL', 'EN'],
      },
      commonLanguages: ['FR', 'PL', 'EN'],
    });
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns when a required nationality or spoken-language value is missing', () => {
    for (const [row, warning] of [
      [
        '| Nationality | FR | ISO 3166-1 code, e.g. FR |',
        'missing Bride nationality',
      ],
      [
        '| Spoken languages | FR, PL, EN | ISO 639-1 codes, comma separated |',
        'missing Bride spoken languages',
      ],
    ]) {
      const first = template.indexOf(row);
      const source = `${template.slice(0, first)}${row.replace(/^(\| [^|]+ \|)[^|]+(\|.*)$/, '$1  $2')}${template.slice(first + row.length)}`;
      const result = parse(source);
      expect(result.warnings, row).toContain(`COUPLE IDENTITY: ${warning}`);
      expect(result.errors).toEqual([]);
    }
  });
});
