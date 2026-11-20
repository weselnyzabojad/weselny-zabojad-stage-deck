import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #260 isMainSongRequired schema flag', () => {
  it('defines the boolean step property with a false default', () => {
    const schema = JSON.parse(read('schema/domains/steps.json'));
    const prop = schema.$defs.step.properties.isMainSongRequired;
    expect(prop.type).toBe('boolean');
    expect(prop.default).toBe(false);
  });

  it('marks the key predefined moments in the demo cartridge', () => {
    const grand = DEMO_WEDDING.steps.find((step) => step.id === 'step_03');
    const cake = DEMO_WEDDING.steps.find((step) => step.id === 'step_05');
    expect(grand.isMainSongRequired).toBe(true);
    expect(cake.isMainSongRequired).toBe(true);
  });

  it('keeps the main-song flag in the canonical step catalog', () => {
    const catalog = read('src/lib/canonicalSteps.js');
    expect(catalog).toContain('Grand Entrance');
    expect(catalog).toContain('isMainSongRequired: true');
    expect(read('schema/google-doc-template.md')).not.toContain('Main Song Required');
  });
});
