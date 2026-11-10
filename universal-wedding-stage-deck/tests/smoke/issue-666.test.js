import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #666 mini-session Google Doc source flags', () => {
  it('keeps the required enabled value in the template and drops runtime lead time', () => {
    expect(template).toContain('Mini session enabled: true');
    expect(template).not.toContain('latest start before sunset');
  });

  it('maps the required flag and keeps the optional locations safe', async () => {
    const { cartridge, warnings } = parse();

    expect(cartridge.photoPlan.miniSession).toEqual({
      enabled: true,
      location: 'Garden',
      backupLocation: 'Ballroom window',
    });
    expect(cartridge.photoPlan.miniSession).not.toHaveProperty(
      'latestStartMinutesBeforeSunset',
    );
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns and defaults enabled to false when the Doc value is missing', async () => {
    const result = parse(template.replace('Mini session enabled: true', 'Mini session enabled: '));

    expect(result.warnings).toContain('MINI SESSION: missing enabled');
    expect(result.cartridge.photoPlan.miniSession.enabled).toBe(false);
    expect(await validateCartridge(result.cartridge)).toEqual([]);
  });

  it('omits the optional locations safely', async () => {
    const source = template
      .replace('Mini session location: Garden', 'Mini session location: ')
      .replace('Mini session backup location: Ballroom window', 'Mini session backup location: ');
    const { cartridge, warnings } = parse(source);

    expect(cartridge.photoPlan.miniSession).toEqual({ enabled: true });
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });
});
