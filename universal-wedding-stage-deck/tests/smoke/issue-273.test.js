import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';
import { buildMandatorySteps } from '../../src/lib/mandatorySteps.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #273 mandatory steps', () => {
  it('derives prestation ready exactly one hour before first arrival', () => {
    const steps = buildMandatorySteps(DEMO_WEDDING);
    const prep = steps.find((step) => step.kind === 'PREP_READY');
    const arrival = steps.find((step) => step.kind === 'FIRST_GUESTS_ARRIVAL');
    expect(arrival.time).toBe('15:30');
    expect(prep.time).toBe('14:30');
  });

  it('includes the kitchen service hours and skips missing third supper', () => {
    const labels = buildMandatorySteps(DEMO_WEDDING).map((step) => step.label);
    expect(labels).toContain('Obiad weselny');
    expect(labels).toContain('Pierwsza kolacja');
    expect(labels).toContain('Druga kolacja');
    expect(labels).not.toContain('Trzecia kolacja');
  });

  it('validates the schema block', () => {
    const schema = JSON.parse(read('schema/wedding-schema-v1.1.json'));
    expect(schema.properties.mandatorySteps).toBeTruthy();
    expect(schema.properties.mandatorySteps.properties.kitchenServices).toBeTruthy();
  });
});
