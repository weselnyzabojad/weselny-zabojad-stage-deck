import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #261 predefined step renames and Buffets deletion', () => {
  it('renames the four predefined steps', () => {
    const titles = DEMO_WEDDING.steps.map((step) => step.title);
    expect(titles).toContain("Cocktail / Vin d'honneur");
    expect(titles).toContain('Ceremony');
    expect(titles).toContain('Grand Entrance');
    expect(titles).toContain('Wedding cake');
  });

  it('removes Buffets Open & Dance Floor everywhere', () => {
    for (const file of [
      'src/demo/demoWedding.js',
      'schema/wedding-cartridge.example.json',
      'schema/fixtures/real-jennifer-guillaume.json',
      'schema/google-doc-template.md',
    ]) {
      expect(read(file)).not.toContain('Buffets Open & Dance Floor');
      expect(read(file)).not.toContain('Aperitif in Garden');
      expect(read(file)).not.toContain('Outdoor Civil Ceremony');
      expect(read(file)).not.toContain('Hall Entrance, Toast & Dinner Start');
      expect(read(file)).not.toContain('Cake & Sparklers');
    }
  });

  it('keeps retained step ids stable and removes step_04', () => {
    expect(DEMO_WEDDING.steps.map((step) => step.id)).toEqual(
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
    expect(DEMO_WEDDING.steps.map((step) => step.id)).not.toContain('step_04');
  });
});
