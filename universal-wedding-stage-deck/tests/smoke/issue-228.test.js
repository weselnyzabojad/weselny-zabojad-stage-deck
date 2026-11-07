import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mapPhotoPlanToSteps } from '../../src/lib/photoPlan.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const timeline = [
  { step: { id: 's1', title: 'Group photos' } },
  { step: { id: 's2', title: 'Mini session' } },
  { step: { id: 's3', title: 'Cake' } },
];

describe('issue #228 photo plan details in step cards', () => {
  it('maps plan elements by explicit stepId first', () => {
    const map = mapPhotoPlanToSteps({
      groupPhotos: { stepId: 's3', location: 'Garden' },
      miniSession: { stepId: 's1', durationMin: 20 },
    }, timeline);
    expect(map.s3[0].type).toBe('groupPhotos');
    expect(map.s1[0].type).toBe('miniSession');
  });

  it('falls back to deterministic title keywords', () => {
    const map = mapPhotoPlanToSteps({
      groupPhotos: { location: 'Garden' },
      miniSession: { durationMin: 20 },
      specialEffects: { sparklers: true },
    }, timeline);
    expect(map.s1[0].type).toBe('groupPhotos');
    expect(map.s2[0].type).toBe('miniSession');
    expect(map.s3[0].type).toBe('specialEffects');
  });

  it('removes the standalone Photo plan card and renders details in the step stack', () => {
    const photo = read('src/components/PhotographerView.jsx');
    expect(photo).not.toContain('title="Photo plan"');
    expect(photo).toContain('entryBodies={cueBodies}');
    expect(photo).toContain('PhotoPlanDetails');
  });
});
