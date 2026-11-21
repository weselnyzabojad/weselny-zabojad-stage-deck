import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../helpers/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #659 cake Google Doc source flags', () => {
  it('drops cake.serveTime from the schema, example and template', () => {
    expect(read('schema/domains/cake.json')).not.toContain('serveTime');
    expect(read('schema/domains/cake.example.json')).not.toContain('serveTime');
    expect(read('supabase/functions/_shared/domains/cake.json')).not.toContain('serveTime');
    expect(template).not.toContain('Serve time');
  });

  it('maps the required cake fields and leaves out serveTime', async () => {
    const { cartridge, warnings } = parse();

    expect(cartridge.cake).toEqual({
      time: '20:30',
      cuttingSong: 'Cake — The Coup',
      sparklers: true,
    });
    expect(cartridge.cake).not.toHaveProperty('serveTime');
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns when a required cake value is missing', () => {
    for (const [row, message] of [
      ['| Time | 20:30 | HH:MM |', 'CAKE: missing Time'],
      ['| Cutting song | Cake — The Coup | Track — Artist |', 'CAKE: missing Cutting song'],
      ['| Sparklers | true | true or false |', 'CAKE: missing Sparklers'],
    ]) {
      const source = template.replace(
        row,
        row.replace(/^\| ([^|]+) \| [^|]+ \|/, '| $1 |  |'),
      );
      const result = parse(source);
      expect(result.warnings.some((warning) => warning.includes(message)), message).toBe(true);
    }
  });
});
