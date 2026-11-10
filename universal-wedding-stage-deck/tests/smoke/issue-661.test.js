import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #661 cultural-rules Google Doc source flags', () => {
  it('keeps every required status in the template', () => {
    for (const rule of ['stoLat', 'gorzko', 'breadSalt']) {
      expect(template, rule).toContain(`| ${rule} |`);
    }
  });

  it('maps the required statuses and the optional Bread & Salt note', async () => {
    const { cartridge, warnings } = parse();

    expect(cartridge.culturalRules).toEqual({
      sto_lat: { status: 'YES_EXPLAIN' },
      gorzko: { status: 'IF_GUESTS_START' },
      bread_salt: { status: 'YES', note: 'Vodka vs water shot; break glasses.' },
    });
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns when a required status is missing', () => {
    for (const [row, warning] of [
      ['| stoLat | YES_EXPLAIN |', 'missing Sto Lat status'],
      ['| gorzko | IF_GUESTS_START |', 'missing Gorzko status'],
      ['| breadSalt | YES |', 'missing Bread & Salt status'],
    ]) {
      const source = template.replace(row, row.replace(/\| [A-Z_]+ \|/, '|  |'));
      const result = parse(source);
      expect(result.warnings, warning).toContain(`CULTURAL RULES: ${warning}`);
    }
  });

  it('degrades a missing Bread & Salt note safely', async () => {
    const source = template.replace(
      '| breadSalt | YES | Vodka vs water shot; break glasses. |',
      '| breadSalt | YES |  |',
    );
    const { cartridge } = parse(source);

    expect(cartridge.culturalRules.bread_salt).toEqual({ status: 'YES' });
    expect(await validateCartridge(cartridge)).toEqual([]);
  });
});
