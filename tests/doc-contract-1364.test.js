import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderClientTemplateHtml } from '../src/lib/clientTemplate.js';
import { parseGoogleDocTemplate } from '../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from './helpers/googleDocCartridge.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #1364 couple, host languages and ceremony contract', () => {
  it('uses per-person identity tables and host languages', () => {
    expect(template).toContain('### Bride');
    expect(template).toContain('### Groom');
    expect(template).toContain('| Spoken languages |');
    expect(template).toContain('| Host languages |');
    expect(template).not.toContain('Bride first name');
    expect(template).not.toContain('Shared languages');
    expect(template).not.toContain('Default content');
  });

  it('computes common languages as the spoken-language intersection', () => {
    const row =
      '| Spoken languages | FR, PL, EN | ISO 639-1 codes, comma separated |';
    const first = template.indexOf(row);
    const second = template.indexOf(row, first + 1);
    const groomRow = row.replace(
      /^(\| Spoken languages \|)[^|]*(\|.*)$/,
      '$1 FR, EN $2',
    );
    const source =
      template.slice(0, second) + groomRow + template.slice(second + row.length);
    const { cartridge } = parse(source);
    const { bride, groom } = cartridge.coupleProfile;
    expect(bride.spokenLanguages).toEqual(['FR', 'PL', 'EN']);
    expect(groom.spokenLanguages).toEqual(['FR', 'EN']);
    expect(cartridge.coupleProfile.commonLanguages).toEqual(['FR', 'EN']);
  });

  it('takes first names from admin context and displays them in the generated Doc', () => {
    const parsed = parseGoogleDocTemplate(template);
    const result = googleDocTemplateToCartridge(parsed, {
      brideFirstName: 'Anna',
      groomFirstName: 'Piotr',
    });
    expect(result.cartridge.coupleProfile.bride.firstName).toBe('Anna');
    expect(result.cartridge.coupleProfile.groom.firstName).toBe('Piotr');
    const html = renderClientTemplateHtml({
      brideName: 'Anna',
      groomName: 'Piotr',
      venueName: 'Dwór',
      venueAddress: 'Lipowa 12',
      template,
    });
    expect(html).toContain('>Bride: Anna</h3>');
    expect(html).toContain('>Groom: Piotr</h3>');
  });

  it('removes the ceremony step and object when ceremony type is OFF', () => {
    const source = template.replace(
      '| Ceremony type | RELIGIOUS | CIVIL, RELIGIOUS, HUMANIST or OFF |',
      '| Ceremony type | OFF | CIVIL, RELIGIOUS, HUMANIST or OFF |',
    );
    const { cartridge, errors } = parse(source);
    expect(errors).toEqual([]);
    expect(cartridge.steps.some((step) => /ceremony/i.test(step.title))).toBe(false);
    expect(cartridge.steps.some((step) => step.id === 'step_02')).toBe(false);
    expect(cartridge.steps.some((step) => step.ceremony)).toBe(false);
  });

  it('declares OFF in the ceremony schema and host languages in the language schema', () => {
    const steps = JSON.parse(read('schema/domains/steps.json'));
    expect(steps.$defs.ceremony.properties.type.enum).toContain('OFF');
    const languages = JSON.parse(read('schema/domains/languages.json'));
    expect(languages.properties.languages.required).toEqual(['hostLanguages']);
    expect(languages.properties.languages.properties.defaultContent).toBeUndefined();
    const couple = JSON.parse(read('schema/domains/couple-profile.json'));
    expect(couple.$defs.person.properties.spokenLanguages).toBeTruthy();
  });
});
