import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));
const firstDanceRow =
  '| first_dance | FIRST_DANCE | Perfect | Ed Sheeran | Album version | STREAMING |  | Duet version if available. |';

describe('issue #663 first-dance Google Doc source flags', () => {
  it('keeps the required first-dance song in the template', () => {
    expect(template).toContain(firstDanceRow);
    expect(template).toMatch(/\| step_08 \| 21:45 \|[^\n]*First Dance/);
  });

  it('maps the required step and song fields', async () => {
    const { cartridge, warnings } = parse();
    const step = cartridge.steps.find((entry) => entry.id === 'step_08');

    expect(step).toMatchObject({
      time: '21:45',
      title: 'First Dance',
      type: 'FLEXIBLE',
      location: 'Main Hall',
      isMainSongRequired: true,
      firstDanceMode: 'NORMAL',
    });
    expect(step.song).toEqual({
      artist: 'Ed Sheeran',
      title: 'Perfect',
      Note: 'Duet version if available.',
      source: 'OTHER',
    });
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns when a required song value is missing', () => {
    const row = (cells) => `| first_dance | FIRST_DANCE | ${cells} |`;
    for (const [source, warning] of [
      [template.replace(firstDanceRow, row('Perfect |  | Album version | STREAMING |  | Duet version if available.')), 'IMPORTANT SONGS row skipped: missing Artist'],
      [template.replace(firstDanceRow, row(' | Ed Sheeran | Album version | STREAMING |  | Duet version if available.')), 'IMPORTANT SONGS row skipped: missing Title'],
      [template.replace(firstDanceRow, ''), 'FIRST DANCE: missing FIRST_DANCE song'],
    ]) {
      const result = parse(source);
      expect(result.warnings, warning).toContain(warning);
    }
  });

  it('degrades the optional first-dance values safely', async () => {
    const source = template
      .replace(firstDanceRow, firstDanceRow.replace('| Duet version if available. |', '|  |'))
      .replace('Mode NORMAL; start at 12s; stop after 4m 30s.', 'Mode NORMAL.');
    const { cartridge, warnings } = parse(source);
    const step = cartridge.steps.find((entry) => entry.id === 'step_08');

    expect(step.song.Note).toBe('');
    expect(step).not.toHaveProperty('firstDanceStartAt');
    expect(step).not.toHaveProperty('firstDanceStopAt');
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });
});
