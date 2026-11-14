import { describe, expect, it } from 'vitest';
import {
  mapPhotoPlanToSteps,
  resolveMiniSessionTwinStepId,
  resolvePhotoPlan,
} from '../../src/lib/photoPlan.js';

const timeline = [
  { step: { id: 'step_01', title: 'Cocktail', time: '16:30' } },
  { step: { id: 'step_02', title: 'Group photos', time: '18:00' } },
  { step: { id: 'step_03', title: 'Dinner with guests', time: '19:30' } },
  { step: { id: 'step_04', title: 'Cake and sparklers', time: '21:00' } },
];

describe('issue #944 photo-plan dead stepId removal', () => {
  it('drops stepId from guest coverage, special effects and mini session', () => {
    const plan = resolvePhotoPlan({
      photoPlan: {
        miniSession: { enabled: true, stepId: 'step_01', location: 'Garden' },
        groupPhotos: { stepId: 'step_02', groups: [] },
        specialEffects: { stepId: 'step_04', sparklers: true },
        guestCoverage: { stepId: 'step_03', allGuests: true },
      },
    });

    expect(plan.miniSession).not.toHaveProperty('stepId');
    expect(plan.specialEffects).not.toHaveProperty('stepId');
    expect(plan.guestCoverage).not.toHaveProperty('stepId');
  });

  it('keeps the group-photo explicit step binding', () => {
    const plan = resolvePhotoPlan({
      photoPlan: {
        groupPhotos: { stepId: 'step_02', location: 'Garden', groups: [] },
      },
    });
    expect(plan.groupPhotos.stepId).toBe('step_02');

    const map = mapPhotoPlanToSteps(plan, timeline);
    expect(map.step_02).toEqual([
      { type: 'groupPhotos', data: plan.groupPhotos },
    ]);
    expect(map.step_01).toBeUndefined();
  });

  it('maps guest coverage and special effects by title keywords', () => {
    const plan = resolvePhotoPlan({
      photoPlan: {
        guestCoverage: { allGuests: true },
        specialEffects: { sparklers: true },
      },
    });

    const map = mapPhotoPlanToSteps(plan, timeline);
    expect(map.step_03[0]).toMatchObject({ type: 'guestCoverage' });
    expect(map.step_04[0]).toMatchObject({ type: 'specialEffects' });
  });

  it('places the mini session by the chosen hour, not a stepId', () => {
    const plan = resolvePhotoPlan({
      photoPlan: {
        miniSession: { enabled: true, stepId: 'step_01', location: 'Garden' },
      },
    });
    expect(plan.miniSession).not.toHaveProperty('stepId');
    expect(resolveMiniSessionTwinStepId(timeline, '17:15')).toBe('step_01');
    expect(resolveMiniSessionTwinStepId(timeline, '19:00')).toBe('step_02');
    expect(resolveMiniSessionTwinStepId(timeline, '21:30')).toBe('step_04');
  });
});
