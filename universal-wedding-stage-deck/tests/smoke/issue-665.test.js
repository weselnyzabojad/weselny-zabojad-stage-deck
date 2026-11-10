import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #665 guest-coverage Google Doc source flags', () => {
  it('keeps the required all-guests value and group labels in the template', () => {
    expect(template).toContain('Guest coverage all guests: false');
    expect(template).toContain('Guest coverage groups: Immediate family, Witnesses');
  });

  it('maps the required values and the optional description', async () => {
    const { cartridge, warnings } = parse();
    const coverage = cartridge.photoPlan.guestCoverage;

    expect(coverage).toMatchObject({
      allGuests: false,
      description: 'Formal photos with immediate family and witnesses only.',
      groups: [
        { id: 'immediate_family', label: 'Immediate family' },
        { id: 'witnesses', label: 'Witnesses' },
      ],
    });
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns and defaults allGuests to false when the Doc value is missing', async () => {
    const result = parse(
      template.replace('Guest coverage all guests: false', 'Guest coverage all guests: '),
    );

    expect(result.warnings).toContain('GUEST COVERAGE: missing all guests');
    expect(result.cartridge.photoPlan.guestCoverage.allGuests).toBe(false);
    expect(await validateCartridge(result.cartridge)).toEqual([]);
  });

  it('degrades the optional description safely', async () => {
    const source = template.replace(
      'Guest coverage description: Formal photos with immediate family and witnesses only.',
      'Guest coverage description: ',
    );
    const { cartridge, warnings } = parse(source);

    expect(cartridge.photoPlan.guestCoverage).not.toHaveProperty('description');
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });
});
