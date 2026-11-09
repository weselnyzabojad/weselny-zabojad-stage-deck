import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));
const photoRow = '| photobooth | PHOTO_BOOTH | Fotobudka | yes | 20:00 | 23:30 | Garden | Foto Fun | Unlimited prints |';

describe('issue #463 parallel attractions contract', () => {
  it('parses the template attraction table', () => {
    const { cartridge } = parse();
    expect(cartridge.attractions).toHaveLength(3);
    expect(cartridge.attractions.map((item) => item.type)).toEqual([
      'PHOTO_BOOTH',
      'GUEST_BOOK',
      'POLAROIDS',
    ]);
    expect(cartridge.attractions[0]).toMatchObject({
      id: 'photobooth',
      name: 'Fotobudka',
      booked: true,
      startTime: '20:00',
      endTime: '23:30',
      location: 'Garden',
      provider: 'Foto Fun',
      notes: 'Unlimited prints',
    });
  });

  it('accepts every documented type alias', () => {
    for (const [alias, type] of [
      ['photobooth', 'PHOTO_BOOTH'],
      ['photo booth', 'PHOTO_BOOTH'],
      ['fotobudka', 'PHOTO_BOOTH'],
      ['guest book', 'GUEST_BOOK'],
      ['guestbook', 'GUEST_BOOK'],
      ['księga gości', 'GUEST_BOOK'],
      ['polaroid', 'POLAROIDS'],
      ['polaroidy', 'POLAROIDS'],
      ['instax', 'POLAROIDS'],
      ['instant photos', 'POLAROIDS'],
      ['lasers', 'OTHER'],
    ]) {
      const source = template.replace('| photobooth | PHOTO_BOOTH |', `| photobooth | ${alias} |`);
      expect(parse(source).cartridge.attractions[0].type, alias).toBe(type);
    }
  });

  it('retains booked:no rows without showing them as booked', () => {
    const source = template.replace(photoRow, photoRow.replace('| yes |', '| no |'));
    const attraction = parse(source).cartridge.attractions[0];
    expect(attraction.booked).toBe(false);
    expect(attraction.name).toBe('Fotobudka');
  });

  it('warns and skips invalid or reversed times and missing names', () => {
    const invalid = parse(template.replace(photoRow, photoRow.replace('| 20:00 |', '| 25:00 |')));
    expect(invalid.cartridge.attractions).toHaveLength(2);
    expect(invalid.warnings.some((warning) => warning.includes('invalid start/end'))).toBe(true);

    const reversed = parse(template.replace(photoRow, photoRow.replace('| 20:00 | 23:30 |', '| 23:30 | 20:00 |')));
    expect(reversed.cartridge.attractions).toHaveLength(2);
    expect(reversed.warnings.some((warning) => warning.includes('end must be after start'))).toBe(true);

    const unnamed = parse(template.replace(photoRow, photoRow.replace('| Fotobudka |', '|  |')));
    expect(unnamed.cartridge.attractions).toHaveLength(2);
    expect(unnamed.warnings.some((warning) => warning.includes('missing name'))).toBe(true);
  });

  it('does not create or alter timeline steps', () => {
    const withAttractions = parse().cartridge.steps.map((step) => step.id);
    const without = parse(template.replace(/## ATTRACTIONS[\s\S]*$/, '')).cartridge.steps.map(
      (step) => step.id,
    );
    expect(withAttractions).toEqual(without);
  });

  it('validates the schema and rejects malformed entries', async () => {
    const cartridge = parse().cartridge;
    expect(await validateCartridge(cartridge)).toEqual([]);

    const badType = {
      ...cartridge,
      attractions: [{ ...cartridge.attractions[0], type: 'LASERS' }],
    };
    expect(await validateCartridge(badType)).not.toEqual([]);

    const missingName = {
      ...cartridge,
      attractions: [{ ...cartridge.attractions[0], name: '' }],
    };
    expect(await validateCartridge(missingName)).not.toEqual([]);

    const missingEnd = {
      ...cartridge,
      attractions: cartridge.attractions.map(({ endTime, ...rest }) => rest),
    };
    expect(await validateCartridge(missingEnd)).not.toEqual([]);
  });

  it('keeps example, demo and the database surface aligned', async () => {
    const domainExample = JSON.parse(read('schema/domains/attractions.example.json'));
    expect(domainExample.attractions.map((item) => item.type)).toEqual([
      'PHOTO_BOOTH',
      'GUEST_BOOK',
      'POLAROIDS',
    ]);
    const example = JSON.parse(read('schema/wedding-cartridge.example.json'));
    expect(await validateCartridge(example)).toEqual([]);
    expect(DEMO_WEDDING.attractions).toHaveLength(3);
    expect(read('supabase/schema.sql')).not.toContain('attractions');
  });
});
