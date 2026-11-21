import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../helpers/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #665 group-photo Google Doc source flags', () => {
  it('keeps the optional description key and removes guest-coverage keys', () => {
    expect(template).toContain(
      '| Group photos description | Formal photos with immediate family and witnesses only. | Short note |',
    );
    expect(template).not.toMatch(/Guest coverage/i);
  });

  it('maps the required values and the optional description', async () => {
    const { cartridge, warnings } = parse();
    const groupPhotos = cartridge.photoPlan.groupPhotos;

    expect(groupPhotos).toMatchObject({
      description: 'Formal photos with immediate family and witnesses only.',
      groups: [
        { id: 'bride_s_family', label: "Bride's family" },
        { id: 'groom_s_family', label: "Groom's family" },
        { id: 'friends', label: 'Friends' },
      ],
    });
    expect(cartridge.photoPlan).not.toHaveProperty('guestCoverage');
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('degrades the optional description safely', async () => {
    const source = template.replace(
      '| Group photos description | Formal photos with immediate family and witnesses only. | Short note |',
      '| Group photos description |  | Short note |',
    );
    const { cartridge, warnings } = parse(source);

    expect(cartridge.photoPlan.groupPhotos).not.toHaveProperty('description');
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });
});
