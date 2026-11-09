import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import { buildGameClicker } from '../../src/lib/games.js';
import { filterEnabledSteps } from '../../src/lib/predefinedSteps.js';
import { resolvePhotoPlan } from '../../src/lib/photoPlan.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

const wedding = {
  games: { enabled: true, questionLists: [] },
  steps: [
    {
      id: 'step_speed_foto',
      time: '22:15',
      durationMin: 15,
      title: 'Speed Foto',
      type: 'FLEXIBLE',
      location: 'Dancefloor',
      optionalFlag: 'games',
    },
  ],
  photoPlan: { speedFoto: { stepId: 'step_speed_foto' } },
};

describe('issue #574 speedFoto as a game step', () => {
  it('defines the speed-foto domain schema and validates its example', () => {
    const domain = json('schema/domains/speed-foto.json');
    expect(domain.properties.speedFoto.properties.stepId.type).toBe('string');
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    expect(ajv.compile(domain)(json('schema/domains/speed-foto.example.json'))).toBe(true);
  });

  it('references the domain from photo-plan.json and removes it from the example', () => {
    const photoPlan = json('schema/domains/photo-plan.json');
    expect(photoPlan.properties.photoPlan.properties.speedFoto.$ref).toContain(
      'speed-foto.json#/properties/speedFoto',
    );
    expect(json('schema/domains/photo-plan.example.json').photoPlan).not.toHaveProperty(
      'speedFoto',
    );
  });

  it('models speedFoto as a game step with no question list / clicker', () => {
    const step = wedding.steps[0];
    expect(step.optionalFlag).toBe('games');
    expect(step.gameId).toBeUndefined();
    expect(buildGameClicker(wedding, step.gameId)).toBeNull();
    expect(filterEnabledSteps(wedding).some((entry) => entry.id === 'step_speed_foto')).toBe(
      true,
    );
  });

  it('references the step from the photo plan without duplicating timing', () => {
    const plan = resolvePhotoPlan(wedding);
    expect(plan.speedFoto).toMatchObject({
      stepId: 'step_speed_foto',
      enabled: true,
      durationMin: 15,
    });
  });
});
