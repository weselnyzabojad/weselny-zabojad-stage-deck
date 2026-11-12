import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #308 simplified step types', () => {
  it('allows only FLEXIBLE and HARD_ANCHOR in the schema', () => {
    const schema = JSON.parse(read('schema/domains/steps.json'));
    expect(schema.$defs.step.properties.type.enum).toEqual(['FLEXIBLE', 'HARD_ANCHOR']);
    expect(schema.$defs.step.properties.buffer).toBeUndefined();
    expect(schema.$defs.buffer).toBeUndefined();
  });

  it('removes BUFFER and ELASTIC from cartridge data and template', () => {
    for (const file of [
      'src/demo/demoWedding.js',
      'schema/wedding-cartridge.example.json',
      'schema/fixtures/real-jennifer-guillaume.json',
      'schema/google-doc-template.md',
    ]) {
      const source = read(file);
      expect(source).not.toContain('"BUFFER"');
      expect(source).not.toContain('"ELASTIC"');
      expect(source).not.toContain('| BUFFER |');
      expect(source).not.toContain('| ELASTIC |');
    }
  });

  it('uses only FLEXIBLE and HARD_ANCHOR step types', () => {
    expect(new Set(DEMO_WEDDING.steps.map((step) => step.type))).toEqual(
      new Set(['FLEXIBLE', 'HARD_ANCHOR']),
    );
    for (const step of DEMO_WEDDING.steps.filter((entry) => !entry.mandatory)) {
      expect(step.type).toBe('FLEXIBLE');
    }
  });

  it('uses HARD_ANCHOR only for mandatory predefined steps', () => {
    for (const step of DEMO_WEDDING.steps) {
      if (step.type === 'HARD_ANCHOR') {
        expect(step.optionalFlag).toBeUndefined();
      } else {
        expect(step.type).toBe('FLEXIBLE');
      }
    }
  });

  it('has no buffer ranges left in the demo', () => {
    for (const step of DEMO_WEDDING.steps) {
      expect(step.buffer).toBeUndefined();
    }
  });

  it('exposes only the two type styles', () => {
    const styles = read('src/lib/styleConstants.js');
    expect(styles).toContain('FLEXIBLE');
    expect(styles).toContain('HARD_ANCHOR');
    expect(styles).not.toContain('ELASTIC');
    expect(styles).not.toContain('BUFFER');
  });
});
