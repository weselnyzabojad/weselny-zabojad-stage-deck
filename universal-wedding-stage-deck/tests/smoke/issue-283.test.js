import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #283 first guests arrival as a mandatory constraint', () => {
  it('is no longer a predefined timeline step', () => {
    expect(DEMO_WEDDING.steps.map((step) => step.id)).not.toContain('step_00');
    expect(DEMO_WEDDING.steps.map((step) => step.title)).not.toContain('First guests arrival');
    expect(DEMO_WEDDING.steps[0].id).toBe('step_01');
  });
  it('keeps the first arrival time in the mandatory layer', () => {
    expect(DEMO_WEDDING.mandatorySteps.firstGuestsArrival).toBe('15:30');
  });
  it('is not editable by Venue Manager', () => {
    expect(read('src/components/VenueManagerView.jsx')).not.toContain('label="First guests arrival"');
  });
  it('schema still supports ceremony context', () => {
    const schema = JSON.parse(read('schema/wedding-schema-v1.1.json'));
    expect(schema.$defs.step.properties.ceremonyType).toBeTruthy();
  });
});
