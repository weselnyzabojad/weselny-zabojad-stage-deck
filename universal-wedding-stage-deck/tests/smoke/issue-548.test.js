import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildMandatorySteps, resolveMandatoryConstraints } from '../../src/lib/mandatorySteps.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #548 variable-length kitchen courses', () => {
  it('declares kitchen services as an array of named courses', () => {
    const schema = JSON.parse(read('schema/wedding-schema-v1.1.json'));
    const courses = schema.properties.mandatorySteps.properties.kitchenServices;
    expect(courses.type).toBe('array');
    expect(courses.items.required).toContain('id');
    expect(courses.items.required).toContain('time');
    expect(courses.items.properties.serviceMode.enum).toEqual(['TABLE_SERVICE', 'BUFFET']);
    expect(courses.items.properties.name.type).toBe('string');
  });

  it('resolves an arbitrary number of courses in serving order', () => {
    const wedding = {
      mandatorySteps: {
        firstGuestsArrival: '15:30',
        kitchenServices: [
          { id: 'dinner', name: 'Dinner', time: '16:15', serviceMode: 'TABLE_SERVICE' },
          { id: 'supper_1', name: 'Supper I', time: '19:15', serviceMode: 'TABLE_SERVICE' },
          { id: 'supper_2', name: 'Supper II', time: '22:30', serviceMode: 'BUFFET' },
          { id: 'supper_3', name: 'Supper III', time: '01:00', serviceMode: 'BUFFET' },
          { id: 'supper_4', name: 'Supper IV', time: '02:30', serviceMode: 'TABLE_SERVICE' },
        ],
      },
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
    expect(result.cartridge.mandatorySteps.kitchenServices.map((course) => course.id)).toEqual([
      'dinner',
      'supper_1',
      'supper_2',
    ]);
    expect(result.cartridge.mandatorySteps.kitchenServices[2]).toMatchObject({
      name: 'Supper II',
      time: '23:30',
      serviceMode: 'BUFFET',
    });
  });
});
