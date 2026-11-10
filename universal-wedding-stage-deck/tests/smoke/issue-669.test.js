import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #669 photo-plan Google Doc source flags', () => {
  it('keeps only the required coordinates in the template', () => {
    expect(template).toContain('Sunset latitude: 51.05');
    expect(template).toContain('Sunset longitude: 16.19');
    expect(template).not.toContain('Sunset provider');
    expect(template).not.toContain('Sunset time');
  });

  it('maps the required coordinates and leaves runtime sunset data alone', async () => {
    const { cartridge, warnings } = parse();

    expect(cartridge.photoPlan.sunset).toEqual({
      provider: 'sunrise-sunset.org',
      latitude: 51.05,
      longitude: 16.19,
      status: 'UNAVAILABLE',
    });
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('ignores runtime sunset values even when they appear in the Doc', () => {
    const source = template.replace(
      'Sunset longitude: 16.19',
      [
        'Sunset longitude: 16.19',
        'Sunset time: 20:12',
        'Golden hour start: 19:32',
        'Civil twilight end: 20:48',
        'Sunset status: LIVE',
        'Sunset last fetched at: 2026-08-20T17:05:00.000Z',
      ].join('\n'),
    );
    const { cartridge } = parse(source);

    expect(cartridge.photoPlan.sunset).toEqual({
      provider: 'sunrise-sunset.org',
      latitude: 51.05,
      longitude: 16.19,
      status: 'UNAVAILABLE',
    });
  });

  it('warns when a required coordinate is missing', () => {
    const result = parse(template.replace('Sunset latitude: 51.05', 'Sunset latitude: '));

    expect(result.warnings).toContain('PHOTO PLAN: missing Sunset latitude');
    expect(result.cartridge.photoPlan.sunset).not.toHaveProperty('latitude');
  });
});
