import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../src/lib/googleDocCartridge.js';
import { DEFAULT_WEDDING } from '../src/demo/demoWedding.js';
import { validateCartridge } from '../schema/validate-lib.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

function withSpeechMode(value) {
  return template.replace(/^Speech mode:.*$/m, `Speech mode: ${value}`);
}

describe('issue #973 speech mode Doc contract', () => {
  it('maps the Doc value to cartridge speechMode with uppercase normalization', () => {
    for (const [raw, expected] of [
      ['COMPLEX', 'COMPLEX'],
      ['LIGHT', 'LIGHT'],
      ['OFF', 'OFF'],
      ['complex', 'COMPLEX'],
      [' light ', 'LIGHT'],
    ]) {
      const { cartridge, warnings } = parse(withSpeechMode(raw));

      expect(cartridge.speechMode, raw).toBe(expected);
      expect(warnings.filter((warning) => warning.startsWith('SPEECHES'))).toEqual([]);
    }
  });

  it('warns and leaves speechMode unset for missing or invalid values', () => {
    for (const [value, message] of [
      ['', 'SPEECHES: missing Speech mode'],
      ['MAYBE', 'SPEECHES: invalid Speech mode "MAYBE"'],
    ]) {
      const { cartridge, warnings } = parse(withSpeechMode(value));

      expect(cartridge.speechMode).toBeUndefined();
      expect(warnings.some((warning) => warning.startsWith(message))).toBe(true);
    }
  });

  it('applies the same rule to an older Doc with no Speech mode field', () => {
    const { cartridge, warnings } = parse(
      template.replace(/^Speech mode:.*\r?\n\r?\n/m, ''),
    );

    expect(cartridge.speechMode).toBeUndefined();
    expect(warnings.some((warning) => warning.startsWith('SPEECHES: missing Speech mode'))).toBe(
      true,
    );
  });

  it('does not warn or invent a mode when the SPEECHES section is absent', () => {
    const start = template.indexOf('## SPEECHES');
    const end = template.indexOf('## CAKE');
    const { cartridge, warnings } = parse(template.slice(0, start) + template.slice(end));

    expect(cartridge.speechMode).toBeUndefined();
    expect(warnings.filter((warning) => warning.startsWith('SPEECHES'))).toEqual([]);
  });

  it('keeps SPEECHES table rows documentation only', () => {
    const result = parse(
      template.replace(
        '| speech_witness | 1 | Bartek | Best man |',
        '| speech_witness | 1 |  | Best man |',
      ),
    );

    expect(result.cartridge).not.toHaveProperty('speeches');
    expect(result.cartridge.speechMode).toBe('COMPLEX');
    expect(result.warnings.filter((warning) => warning.startsWith('SPEECHES'))).toEqual([]);
  });

  it('documents the source in the field map, template and conventions', () => {
    expect(json('schema/google-doc-field-map.json').files['speeches.example.json'].speechMode).toBe(
      'required',
    );
    expect(json('schema/domains/speeches.json').required).toEqual(['speeches']);
    expect(template).toContain('Speech mode: COMPLEX');
    expect(template).toContain('Only `COMPLEX` authorizes creating');
    expect(read('docs/google-doc-template-conventions.md')).toContain(
      '`Speech mode` maps to the wedding-level `speechMode`',
    );
  });

  it('keeps the Doc-backed mode in examples, fixtures and the demo', () => {
    for (const [path, cartridge] of [
      ['schema/domains/speeches.example.json', json('schema/domains/speeches.example.json')],
      ['schema/fixtures/valid-speeches.json', json('schema/fixtures/valid-speeches.json')],
      [
        'schema/fixtures/real-jennifer-guillaume.json',
        json('schema/fixtures/real-jennifer-guillaume.json'),
      ],
      ['src/demo/demoWedding.js', DEFAULT_WEDDING],
    ]) {
      expect(['OFF', 'LIGHT', 'COMPLEX'], path).toContain(cartridge.speechMode);
      expect(cartridge.speechMode, path).toBe('COMPLEX');
    }
  });

  it('keeps cartridges with an existing admin-set mode readable', async () => {
    const cartridge = json('schema/fixtures/real-jennifer-guillaume.json');

    expect(cartridge.speechMode).toBe('COMPLEX');
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('parsing has no Drive side effects', () => {
    const parser = read('src/lib/googleDocCartridge.js');

    for (const sideEffect of [
      'googleDrive',
      'admin_drive',
      'createGoogleDoc',
      'createSpeechDoc',
      'ensureSpeechFolder',
    ]) {
      expect(parser, sideEffect).not.toContain(sideEffect);
    }
  });
});
