import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../helpers/googleDocCartridge.js';
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

  it('maps the required statuses and leaves the empty Example note absent', async () => {
    const { cartridge, warnings } = parse();

    expect(cartridge.culturalRules).toEqual({
      sto_lat: { status: 'ON_REQUEST' },
      gorzko: { status: 'IF_GUESTS_START' },
      bread_salt: { status: 'YES' },
    });
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('maps a filled Bread & Salt Example cell to the optional note', async () => {
    const source = template.replace(
      '| breadSalt | YES |  |',
      '| breadSalt | YES | Vodka vs water shot; break glasses. |',
    );
    const { cartridge } = parse(source);
    expect(cartridge.culturalRules.bread_salt).toEqual({
      status: 'YES',
      note: 'Vodka vs water shot; break glasses.',
    });
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('reads the statuses from the Doc without a missing-status warning', () => {
    const { cartridge, warnings } = parse();

    expect(cartridge.culturalRules.sto_lat.status).toBe('ON_REQUEST');
    expect(cartridge.culturalRules.gorzko.status).toBe('IF_GUESTS_START');
    expect(cartridge.culturalRules.bread_salt.status).toBe('YES');
    expect(warnings.some((warning) => warning.startsWith('CULTURAL RULES:'))).toBe(false);
  });

  it('degrades a missing Bread & Salt note safely', async () => {
    const { cartridge } = parse();

    expect(cartridge.culturalRules.bread_salt).toEqual({ status: 'YES' });
    expect(await validateCartridge(cartridge)).toEqual([]);
  });
});
