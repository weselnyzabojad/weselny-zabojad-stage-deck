import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../helpers/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #664 group-photos Google Doc source flags', () => {
  it('keeps the required location and group labels in the template', () => {
    expect(template).toContain('| Group photos location | OUTDOOR |');
    expect(template).toContain("| Bride's family | Immediate family |");
    expect(template).toContain("| Groom's family | Immediate family |");
    expect(template).toContain('| Friends |  |');
    expect(template).not.toContain('| Group ID |');
  });

  it('maps the required location and labels with generated IDs', async () => {
    const { cartridge, warnings } = parse();

    expect(cartridge.photoPlan.groupPhotos).toMatchObject({
      location: 'OUTDOOR',
      groups: [
        { id: 'bride_s_family', label: "Bride's family", note: 'Immediate family' },
        { id: 'groom_s_family', label: "Groom's family", note: 'Immediate family' },
        { id: 'friends', label: 'Friends' },
      ],
    });
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns and skips a group row missing its label', () => {
    const result = parse(
      template.replace("| Bride's family | Immediate family |", '|  | Immediate family |'),
    );

    expect(result.warnings).toContain('GROUP PHOTOS: row skipped: missing Label');
    expect(result.cartridge.photoPlan.groupPhotos.groups.map((group) => group.id)).toEqual([
      'groom_s_family',
      'friends',
    ]);
  });

  it('warns when the required location is missing', () => {
    const result = parse(
      template.replace(
        '| Group photos location | OUTDOOR | INDOOR or OUTDOOR |',
        '| Group photos location |  | INDOOR or OUTDOOR |',
      ),
    );

    expect(result.warnings).toContain('GROUP PHOTOS: missing location');
  });
});
