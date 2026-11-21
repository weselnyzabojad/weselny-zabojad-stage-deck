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

  it('maps only the cutting song and derives time from the timeline', async () => {
    const { cartridge, warnings } = parse();

    expect(cartridge.cake).toEqual({
      time: '20:30',
      cuttingSong: 'Cake — The Coup',
    });
    expect(cartridge.cake).not.toHaveProperty('sparklers');
    expect(cartridge.cake).not.toHaveProperty('serveTime');
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns when the cutting song is missing', () => {
    const row = '| Cutting song | Cake — The Coup | Track — Artist |';
    const source = template.replace(row, row.replace(/^\| ([^|]+) \| [^|]+ \|/, '| $1 |  |'));
    const result = parse(source);
    expect(result.warnings).toContain('CAKE: missing Cutting song');
  });
});
