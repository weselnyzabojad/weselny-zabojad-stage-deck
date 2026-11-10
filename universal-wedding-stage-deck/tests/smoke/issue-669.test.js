import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #669 photo-plan Google Doc source flags', () => {
  it('keeps every sunset value in the template', () => {
    for (const line of [
      'Sunset provider: sunrise-sunset.org',
      'Sunset latitude: 51.05',
      'Sunset longitude: 16.19',
      'Sunset last fetched at: 2026-08-20T17:05:00.000Z',
      'Sunset time: 20:12',
      'Golden hour start: 19:32',
      'Civil twilight end: 20:48',
      'Sunset status: LIVE',
    ]) {
      expect(template, line).toContain(line);
    }
  });

  it('maps every sunset value from the Doc', async () => {
    const { cartridge, warnings } = parse();

    expect(cartridge.photoPlan.sunset).toEqual({
      provider: 'sunrise-sunset.org',
      latitude: 51.05,
      longitude: 16.19,
      lastFetchedAt: '2026-08-20T17:05:00.000Z',
      sunsetTime: '20:12',
      goldenHourStart: '19:32',
      civilTwilightEnd: '20:48',
      status: 'LIVE',
    });
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns when a required coordinate is missing', () => {
    const result = parse(template.replace('Sunset latitude: 51.05', 'Sunset latitude: '));

    expect(result.warnings).toContain('PHOTO PLAN: missing Sunset latitude');
    expect(result.cartridge.photoPlan.sunset).not.toHaveProperty('latitude');
  });
});
