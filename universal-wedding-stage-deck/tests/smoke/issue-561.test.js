import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #561 first-dance domain schema', () => {
  it('defines the domain schema and validates its example', () => {
    const domain = json('schema/domains/first-dance.json');
    expect(domain.type).toBe('array');
    expect(domain.items.properties.firstDanceStartAt.pattern).toBe('^[0-5][0-9]:[0-5][0-9]$');
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    expect(ajv.compile(domain)(json('schema/domains/first-dance.example.json'))).toBe(true);
  });

  it('references the domain from the step schema', () => {
    const schema = json('schema/wedding-schema-v1.1.json');
    const step = schema.$defs.step.properties;
    expect(step.firstDanceStartAt.$ref).toContain(
      'first-dance.json#/items/properties/firstDanceStartAt',
    );
    expect(step.firstDanceStopAt.$ref).toContain(
      'first-dance.json#/items/properties/firstDanceStopAt',
    );
    expect(step.song.$ref).toContain('first-dance.json#/items/properties/song');
    expect(step.firstDanceStartAtSec).toBeUndefined();
    expect(step.firstDanceStopAfterSec).toBeUndefined();
  });

  it('removes the old integer-second fields from the cartridge example', () => {
    const example = json('schema/wedding-cartridge.example.json');
    const dance = example.steps.find((step) => step.id === 'step_08');
    expect(dance.firstDanceStartAtSec).toBeUndefined();
    expect(dance.firstDanceStopAfterSec).toBeUndefined();
  });
});
