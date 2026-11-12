import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #590 steps domain schema', () => {
  it('defines the domain schema and validates its example', () => {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    ajv.addSchema(json('schema/domains/first-dance.json'));
    const validate = ajv.compile(json('schema/domains/steps.json'));
    expect(validate(json('schema/domains/steps.example.json'))).toBe(true);
  });

  it('references the domain from the main schema and drops the inline defs', () => {
    const schema = json('schema/wedding-schema-v1.1.json');
    expect(schema.properties.steps.$ref).toBe(
      'https://weselnyzabojad.example/schemas/domains/steps.json#/properties/steps',
    );
    for (const def of ['step', 'djCue', 'teleprompter', 'mcCue', 'speechItem', 'gameQuestion', 'localizedText']) {
      expect(schema.$defs[def], def).toBeUndefined();
    }
  });

  it('keeps the cartridge example valid with mandatory step metadata', () => {
    const cartridge = json('schema/wedding-cartridge.example.json');
    expect(cartridge.steps.length).toBeGreaterThan(1);
    expect(cartridge.steps.find((step) => step.id === 'step_01')).toMatchObject({
      type: 'FLEXIBLE',
    });
    expect(
      cartridge.steps.some((step) => step.mandatory?.kind === 'KITCHEN_SERVICE'),
    ).toBe(true);
    expect(json('schema/domains/steps.example.json').steps.length).toBeGreaterThan(1);
  });
});
