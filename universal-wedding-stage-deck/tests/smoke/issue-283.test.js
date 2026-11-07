import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #283 first guests arrival first step', () => {
  it('is the first step with ceremony context', () => {
    const first = DEMO_WEDDING.steps[0];
    expect(first.id).toBe('step_00');
    expect(first.title).toBe('First guests arrival');
    expect(first.ceremonyType).toBe('CHURCH');
    expect(first.ceremonyLocation).toBeTruthy();
  });
  it('is not editable by Venue Manager', () => {
    expect(read('src/components/VenueManagerView.jsx')).not.toContain('label="First guests arrival"');
  });
  it('schema supports ceremony context', () => {
    const schema = JSON.parse(read('schema/wedding-schema-v1.1.json'));
    expect(schema.$defs.step.properties.ceremonyType).toBeTruthy();
  });
});
