import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #301 predefined timeline data contract', () => {
  const files = [
    'src/demo/demoWedding.js',
    'schema/wedding-cartridge.example.json',
    'schema/fixtures/real-jennifer-guillaume.json',
  ];

  it('removes First guests arrival and Wedding closure from every cartridge', () => {
    for (const file of files) {
      const source = read(file);
      expect(source).not.toContain('First guests arrival');
      expect(source).not.toContain('Wedding closure');
      expect(source).not.toContain('"step_00"');
      expect(source).not.toContain('"step_12"');
    }
  });

  it('keeps both obligations in the mandatory layer', () => {
    expect(DEMO_WEDDING.mandatorySteps.firstGuestsArrival).toBe('15:30');
    expect(DEMO_WEDDING.mandatorySteps.closureTime).toBe('02:00');
  });

  it('keeps the retained predefined steps with stable ids', () => {
    expect(DEMO_WEDDING.steps.map((step) => step.id)).toEqual([
      'step_01',
      'step_02',
      'step_03',
      'step_05',
      'step_06',
      'step_07',
      'step_08',
      'step_09',
      'step_10',
      'step_11',
    ]);
  });

  it('documents the Google Doc timeline contract', () => {
    const template = read('schema/google-doc-template.md');
    expect(template).toContain('First guests arrival and Wedding closure are mandatory constraints');
    expect(template).toContain('| step_01 | 16:30 |');
    expect(template).not.toContain('| step_00 |');
    expect(template).toContain('| step_11 |');
    for (const title of [
      "Cocktail / Vin d'honneur",
      'Ceremony',
      'Grand Entrance',
      'Wedding cake',
      'Wedding Thank-You',
      'Wishes',
      'First Dance',
      'Oczepiny',
      'Test Wiedzy',
      'Test Zgodności',
    ]) {
      expect(template).toContain(title);
    }
  });
});
