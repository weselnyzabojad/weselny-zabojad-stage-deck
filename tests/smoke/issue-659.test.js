import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
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
      photographerCue: 'Front-left of the cake table',
    });
    expect(cartridge.cake).not.toHaveProperty('serveTime');
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns when a required cake value is missing', () => {
    const cakeStart = template.indexOf('## CAKE');
    for (const [line, message] of [
      ['Time: 20:30', 'CAKE: missing Time'],
      ['Cutting song: Cake — The Coup', 'CAKE: missing Cutting song'],
      ['Sparklers: true', 'CAKE: missing Sparklers'],
    ]) {
      const source =
        template.slice(0, cakeStart) +
        template.slice(cakeStart).replace(line, `${line.split(':')[0]}: `);
      const result = parse(source);
      expect(result.warnings.some((warning) => warning.includes(message)), message).toBe(true);
    }
  });
});
