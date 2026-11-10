import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));
const photoRow =
  '| photobooth | PHOTO_BOOTH | Fotobudka | 20:00 | 23:30 | Garden | Foto Fun | Unlimited prints |';

describe('issue #658 attractions Google Doc source flags', () => {
  it('keeps every required attraction column in the template', () => {
    expect(template).toContain(
      '| Attraction ID | Type | Name | Start | End | Location | Provider | Notes |',
    );
  });

  it('maps the required fields and keeps optional fields optional', async () => {
    const { cartridge } = parse();

    expect(cartridge.attractions[0]).toMatchObject({
      id: 'photobooth',
      type: 'PHOTO_BOOTH',
      name: 'Fotobudka',
      startTime: '20:00',
      endTime: '23:30',
      location: 'Garden',
    });
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns and skips a row missing a required Doc value', () => {
    for (const [row, message] of [
      [
        '|  | PHOTO_BOOTH | Fotobudka | 20:00 | 23:30 | Garden | Foto Fun | Unlimited prints |',
        'missing Attraction ID',
      ],
      [
        '| photobooth |  | Fotobudka | 20:00 | 23:30 | Garden | Foto Fun | Unlimited prints |',
        'missing Type',
      ],
      [
        '| photobooth | PHOTO_BOOTH | Fotobudka | 20:00 | 23:30 |  | Foto Fun | Unlimited prints |',
        'missing Location',
      ],
    ]) {
      const result = parse(template.replace(photoRow, row));
      expect(result.cartridge.attractions, message).toHaveLength(2);
      expect(result.warnings.some((warning) => warning.includes(message)), message).toBe(true);
    }
  });

  it('degrades optional values safely', async () => {
    const withoutOptional = template.replace(
      photoRow,
      '| photobooth | PHOTO_BOOTH | Fotobudka | 20:00 | 23:30 | Garden |  |  |',
    );
    const { cartridge, warnings } = parse(withoutOptional);

    expect(cartridge.attractions[0]).toMatchObject({ id: 'photobooth', notes: '' });
    expect(cartridge.attractions[0]).not.toHaveProperty('provider');
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });
});
