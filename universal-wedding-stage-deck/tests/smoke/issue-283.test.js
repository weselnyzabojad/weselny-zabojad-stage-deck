import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #283 first guests arrival as a mandatory constraint', () => {
  it('keeps the first arrival as a mandatory metadata step, not step_00', () => {
    expect(DEMO_WEDDING.steps.map((step) => step.id)).not.toContain('step_00');
    const arrival = DEMO_WEDDING.steps.find(
      (step) => step.mandatory?.kind === 'FIRST_GUESTS_ARRIVAL',
    );
    expect(arrival.time).toBe('15:30');
  });
  it('is not editable by Venue Manager', () => {
    expect(read('src/components/VenueManagerView.jsx')).not.toContain('label="First guests arrival"');
  });
  it('schema still supports ceremony context', () => {
    const schema = JSON.parse(read('schema/domains/steps.json'));
    expect(schema.$defs.step.properties.ceremonyType).toBeTruthy();
  });
});
