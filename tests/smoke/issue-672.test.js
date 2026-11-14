import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #672 steps Google Doc source flags', () => {
  it('resolves the planned and optionalFlag contract decisions', () => {
    const map = json('schema/google-doc-field-map.json');
    expect(map.files['steps.example.json']['steps[].planned']).toBe('no');
    expect(map.files['steps.example.json']['steps[].optionalFlag']).toBe('optional');
    expect(map.todos.some((todo) => todo.file === 'steps.example.json')).toBe(false);
    expect(template).toContain('`Optional Flag` accepts only `oczepiny` or `dj_set`');
  });

  it('maps the Doc-sourced step fields and the optional feature flag', async () => {
    const { cartridge, warnings } = parse();

    expect(cartridge.steps.find((step) => step.id === 'step_09')).toMatchObject({
      time: '00:00',
      title: 'Oczepiny',
      location: 'Main Hall',
      isMainSongRequired: false,
      optionalFlag: 'oczepiny',
    });
    expect(cartridge.steps.find((step) => step.id === 'step_12').optionalFlag).toBe('dj_set');
    expect(warnings).toEqual([]);
    expect(await validateCartridge(cartridge)).toEqual([]);
  });

  it('warns and omits an unknown optional flag', () => {
    const source = template.replace(
      '| step_09 | 00:00 | Oczepiny | HARD_ANCHOR | Main Hall | oczepiny_midnight | false | oczepiny |  |',
      '| step_09 | 00:00 | Oczepiny | HARD_ANCHOR | Main Hall | oczepiny_midnight | false | mystery |  |',
    );
    const result = parse(source);

    expect(result.warnings).toContain('step step_09: unknown Optional Flag "mystery" ignored');
    expect(result.cartridge.steps.find((step) => step.id === 'step_09')).not.toHaveProperty(
      'optionalFlag',
    );
  });

  it('never reads planned from the Doc', () => {
    const { cartridge } = parse();
    expect(cartridge.steps.find((step) => step.id === 'step_08')).not.toHaveProperty('planned');
    expect(
      json('schema/google-doc-field-map.json').files['steps.example.json']['steps[].planned'],
    ).toBe('no');
  });
});
