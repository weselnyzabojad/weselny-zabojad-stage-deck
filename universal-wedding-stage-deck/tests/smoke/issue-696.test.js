import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #696 cultural rule statuses come from the Doc', () => {
  it('copies Sto Lat, Gorzko and Bread & Salt statuses from the Doc table', () => {
    const { cartridge, warnings } = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );

    expect(cartridge.culturalRules).toMatchObject({
      sto_lat: { status: 'YES_EXPLAIN' },
      gorzko: { status: 'IF_GUESTS_START' },
      bread_salt: { status: 'YES' },
    });
    expect(warnings).toEqual([]);
  });

  it('does not emit a missing-status warning for the three rules', () => {
    const { warnings } = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );

    expect(warnings.filter((warning) => warning.includes('CULTURAL RULES'))).toEqual([]);
  });
});
