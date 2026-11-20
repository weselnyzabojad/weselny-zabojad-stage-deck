import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from './helpers/googleDocCartridge.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const template = read('schema/google-doc-template.md');
const parse = (source = template) =>
  googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

describe('issue #1322 consolidate kitchen and cake Doc hours', () => {
  it('keeps one five-column kitchen table and removes Kitchen Services', () => {
    expect(template).toContain(
      '| Course ID | Name | Time | Service Mode | Dietary notes |',
    );
    expect(template).not.toContain('### Kitchen Services');
    expect(template).not.toContain('| Course ID | Name | Time | Dietary notes |');
    expect(template).toContain('| First guests arrival | 15:30 |');
    expect(template).toContain('| Wedding closure | 02:00 |');
    expect(read('src/lib/googleDocCartridge.js')).not.toContain("'Kitchen Services'");
  });

  it('derives kitchen steps and service modes from KITCHEN only', () => {
    const { cartridge, warnings } = parse();
    expect(warnings).toEqual([]);
    expect(cartridge.extensions.kitchen.courses).toHaveLength(3);
    expect(cartridge.extensions.kitchen.courses.map((course) => course.serviceMode)).toEqual([
      'TABLE_SERVICE',
      'TABLE_SERVICE',
      'BUFFET',
    ]);
    for (const [id, time, mode] of [
      ['step_04', '19:00', 'TABLE_SERVICE'],
      ['step_15', '23:00', 'TABLE_SERVICE'],
      ['step_16', '23:30', 'BUFFET'],
    ]) {
      expect(cartridge.steps.find((step) => step.id === id)).toMatchObject({
        time,
        mandatory: { kind: 'KITCHEN_SERVICE', serviceMode: mode },
      });
    }
  });

  it('uses CAKE Time and KITCHEN Time over a divergent TIMELINE', () => {
    const source = template
      .replace('Time: 20:30', 'Time: 21:00')
      .replace(
        '| step_04 | Dinner | 19:00 | TABLE_SERVICE | 1 vegan |',
        '| step_04 | Dinner | 20:00 | TABLE_SERVICE | 1 vegan |',
      );
    const { cartridge, warnings } = parse(source);
    expect(warnings).toContain('CAKE: Time 21:00 differs from TIMELINE 20:30; using CAKE');
    expect(warnings).toContain(
      'KITCHEN: Dinner time 20:00 differs from TIMELINE 19:00; using KITCHEN',
    );
    expect(cartridge.steps.find((step) => step.id === 'step_05').time).toBe('21:00');
    expect(cartridge.steps.find((step) => step.id === 'step_04').time).toBe('20:00');
  });

  it('keeps the TIMELINE time when a section time is missing', () => {
    const source = template
      .replace('Time: 20:30', 'Time: ')
      .replace(
        '| step_04 | Dinner | 19:00 | TABLE_SERVICE | 1 vegan |',
        '| step_04 | Dinner |  | TABLE_SERVICE | 1 vegan |',
      );
    const { cartridge, warnings } = parse(source);
    expect(warnings).toContain('CAKE: missing Time');
    expect(cartridge.steps.find((step) => step.id === 'step_05').time).toBe('20:30');
    expect(cartridge.steps.find((step) => step.id === 'step_04').time).toBe('19:00');
  });
});
