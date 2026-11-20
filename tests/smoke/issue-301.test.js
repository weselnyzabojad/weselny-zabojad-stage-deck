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

  it('never reintroduces the retired step_00/step_12 ids', () => {
    for (const file of files) {
      const source = read(file);
      expect(source).not.toContain('"step_00"');
      expect(source).not.toContain('"step_12"');
    }
  });

  it('keeps both obligations in step mandatory metadata', () => {
    const arrival = DEMO_WEDDING.steps.find(
      (step) => step.mandatory?.kind === 'FIRST_GUESTS_ARRIVAL',
    );
    const closure = DEMO_WEDDING.steps.find(
      (step) => step.mandatory?.kind === 'CLOSURE',
    );
    expect(arrival.time).toBe('15:30');
    expect(closure.time).toBe('02:00');
  });

  it('keeps the retained predefined steps with stable ids', () => {
    const ids = DEMO_WEDDING.steps.map((step) => step.id);
    expect(ids).toEqual(
      expect.arrayContaining([
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
      ]),
    );
  });

  it('documents the Google Doc timeline contract', () => {
    const template = read('schema/google-doc-template.md');
    expect(template).toContain('| Hour | Step name | Example values |');
    expect(template).toContain("| 16:00 | Vin d'honneur / Cocktail |");
    expect(template).not.toContain('| step_00 |');
    expect(template).not.toContain('| Step ID | Time | Title |');
    for (const title of [
      "Vin d'honneur / Cocktail",
      'Ceremony',
      'Grand Entrance',
      'Wedding Cake',
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
