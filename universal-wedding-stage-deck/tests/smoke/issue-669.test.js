import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #669 photo-plan Google Doc source flags', () => {
  it('keeps sunset values out of the Doc template', () => {
    expect(template).not.toContain('Sunset provider');
    expect(template).not.toContain('Sunset latitude');
    expect(template).not.toContain('Sunset longitude');
    expect(template).not.toContain('Sunset time');
    expect(template).not.toContain('Sunset status');
  });

  it('leaves the sunset block to the application snapshot', async () => {
    const { cartridge, warnings } = parse();

    expect(cartridge.photoPlan.sunset).toEqual({
      provider: 'sunrise-sunset.org',
      status: 'UNAVAILABLE',
    });
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });
});
