import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildMandatorySteps, resolveMandatoryConstraints } from '../../src/lib/mandatorySteps.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const kitchenStep = (id, name, time, serviceMode) => ({
  id,
  title: name,
  time,
  durationMin: 1,
  type: 'HARD_ANCHOR',
  location: '',
  mandatory: { kind: 'KITCHEN_SERVICE', label: name, serviceMode },
});

describe('issue #548 variable-length kitchen courses', () => {
  it('declares kitchen services as mandatory step metadata', () => {
    const schema = JSON.parse(read('schema/domains/steps.json'));
    const mandatory = schema.$defs.mandatory;
    expect(mandatory.properties.kind.enum).toContain('KITCHEN_SERVICE');
    expect(mandatory.properties.serviceMode.enum).toEqual(['TABLE_SERVICE', 'BUFFET']);
    expect(schema.$defs.step.properties.mandatory).toBeTruthy();
  });

  it('resolves an arbitrary number of courses in serving order', () => {
    const wedding = {
      steps: [
        kitchenStep('dinner', 'Dinner', '16:15', 'TABLE_SERVICE'),
        kitchenStep('supper_1', 'Supper I', '19:15', 'TABLE_SERVICE'),
        kitchenStep('supper_2', 'Supper II', '22:30', 'BUFFET'),
        kitchenStep('supper_3', 'Supper III', '01:00', 'BUFFET'),
        kitchenStep('supper_4', 'Supper IV', '02:30', 'TABLE_SERVICE'),
      ],
    };
    const constraints = resolveMandatoryConstraints(wedding);
    expect(constraints.kitchenServices.map((course) => course.key)).toEqual([
      'dinner',
      'supper_1',
      'supper_2',
      'supper_3',
      'supper_4',
    ]);
    expect(constraints.kitchenServices[4].mode).toBe('TABLE_SERVICE');

    const milestones = buildMandatorySteps(wedding);
    const kitchen = milestones.filter((step) => step.kind === 'KITCHEN_SERVICE');
    expect(kitchen).toHaveLength(5);
    expect(kitchen[4]).toMatchObject({ label: 'Supper IV', time: '02:30' });
  });

  it('maps every course from the template sub-table without dropping any', () => {
    const parsed = parseGoogleDocTemplate(read('schema/google-doc-template.md'));
    const result = googleDocTemplateToCartridge(parsed);
    const courses = result.cartridge.steps.filter(
      (step) => step.mandatory?.kind === 'KITCHEN_SERVICE',
    );
    expect(courses.map((course) => course.id)).toEqual(['dinner', 'supper_1', 'supper_2']);
    expect(courses[2]).toMatchObject({
      title: 'Supper II',
      time: '23:30',
      mandatory: { serviceMode: 'BUFFET' },
    });
  });
});
