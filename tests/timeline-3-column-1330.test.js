import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from './helpers/googleDocCartridge.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) =>
  googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #1330 parse the 3-column timeline by canonical Step name', () => {
  it('requires exactly the three canonical columns', () => {
    const missing = parse(
      template.replace('| Hour | Step name | Example values |', '| Hour | Step name |'),
    );
    expect(missing.errors.some((error) => error.startsWith('TIMELINE: expected exactly'))).toBe(
      true,
    );

    const extra = parse(
      template.replace(
        '| Hour | Step name | Example values |',
        '| Hour | Step name | Example values | Extra |',
      ),
    );
    expect(extra.errors.some((error) => error.startsWith('TIMELINE: expected exactly'))).toBe(
      true,
    );
  });

  it('trims and matches Step names case-insensitively', () => {
    const result = parse(
      template.replace('| 17:00 | Ceremony |', '| 17:00 |   ceremony   |'),
    );
    expect(result.errors).toEqual([]);
    expect(result.cartridge.steps.find((step) => step.id === 'step_02')).toMatchObject({
      title: 'Ceremony',
      time: '17:00',
    });
  });

  it('derives id, type, flags, location and anchor from the catalog, not the Doc', () => {
    const result = parse(
      template.replace(
        '| 00:00 | Oczepiny | Toss, ties, winner photo, music |',
        '| 00:00 | Oczepiny | HARD_ANCHOR |',
      ),
    );
    expect(result.errors).toEqual([]);
    expect(result.cartridge.steps.find((step) => step.id === 'step_09')).toMatchObject({
      title: 'Oczepiny',
      type: 'HARD_ANCHOR',
      optionalFlag: 'oczepiny',
      isMainSongRequired: false,
      location: 'Venue',
    });
    expect(result.cartridge.hardAnchors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'step_09', time: '00:00' }),
      ]),
    );
  });

  it('creates no step when an optional row is deleted, for every optional step', () => {
    for (const name of ['Oczepiny', 'Test Wiedzy', 'Test Zgodności', 'Musical Set']) {
      const source = template
        .split('\n')
        .filter((line) => !line.startsWith('| ') || !line.includes(`| ${name} |`))
        .join('\n');
      const result = parse(source);
      expect(result.errors, name).toEqual([]);
      expect(result.cartridge.steps.some((step) => step.title === name), name).toBe(false);
    }
  });

  it('reports row, Step name and field for a blank Hour', () => {
    const source = template.replace(
      '| 01:00 | Test Wiedzy | Languages, request, photographer |',
      '|  | Test Wiedzy | Languages, request, photographer |',
    );
    const result = parse(source);
    expect(result.errors).toContain('TIMELINE row 16 (Test Wiedzy): missing Hour');
    expect(result.cartridge.steps.some((step) => step.title === 'Test Wiedzy')).toBe(false);
  });
});
