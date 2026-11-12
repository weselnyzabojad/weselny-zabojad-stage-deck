import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #664 group-photos Google Doc source flags', () => {
  it('keeps the required location and group labels in the template', () => {
    expect(template).toContain('Group photos location: OUTDOOR');
    expect(template).toContain("| bride_family | Bride's family |");
    expect(template).toContain("| groom_family | Groom's family |");
    expect(template).toContain('| friends | Friends |');
  });

  it('maps the required location and labels', async () => {
    const { cartridge, warnings } = parse();

    expect(cartridge.photoPlan.groupPhotos).toMatchObject({
      location: 'OUTDOOR',
      groups: [
        { id: 'bride_family', label: "Bride's family" },
        { id: 'groom_family', label: "Groom's family" },
        { id: 'friends', label: 'Friends' },
      ],
    });
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns and skips a group row missing its label', () => {
    const result = parse(
      template.replace("| bride_family | Bride's family |", '| bride_family |  |'),
    );

    expect(result.warnings).toContain('GROUP PHOTOS: row skipped: missing Label');
    expect(result.cartridge.photoPlan.groupPhotos.groups.map((group) => group.id)).toEqual([
      'groom_family',
      'friends',
    ]);
  });

  it('warns when the required location is missing', () => {
    const result = parse(template.replace('Group photos location: OUTDOOR', 'Group photos location: '));

    expect(result.warnings).toContain('GROUP PHOTOS: missing location');
  });
});
