import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mapMandatoryToSteps } from '../../src/lib/mandatorySteps.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const wedding = {
  weddingId: '2026-08-20_test',
  ceremony: {
    type: 'RELIGIOUS',
    mcSupportRequested: false,
    location: 'St Mary',
  },
};

const steps = [
  {
    id: 'step_01',
    title: 'Cocktail',
    time: '15:30',
    mandatory: { kind: 'FIRST_GUESTS_ARRIVAL', label: 'First guests arrival' },
  },
  { id: 'step_02', title: 'Ceremony', time: '17:00' },
  { id: 'step_03', title: 'Grand Entrance', time: '18:00' },
  {
    id: 'dinner',
    title: 'Dinner',
    time: '18:30',
    mandatory: { kind: 'KITCHEN_SERVICE', label: 'Dinner', serviceMode: 'TABLE_SERVICE' },
  },
  {
    id: 'step_05',
    title: 'Wedding cake',
    time: '20:30',
    mandatory: { kind: 'CAKE_SERVICE', label: 'Wedding cake', cakeServiceMode: 'CUT_IN_PLACE' },
  },
  {
    id: 'supper_2',
    title: 'Supper II',
    time: '23:30',
    mandatory: { kind: 'KITCHEN_SERVICE', label: 'Supper II', serviceMode: 'BUFFET' },
  },
];

describe('issue #384 mandatory data embedded in steps', () => {
  it('keeps ceremony data on its step without first-arrival chips', () => {
    const mapped = mapMandatoryToSteps(wedding, steps, { role: 'mc' });
    expect(mapped.step_01).toBeUndefined();
    expect(mapped.step_02).toEqual([
      expect.objectContaining({
        kind: 'ceremonyNote',
        text: 'Religious wedding ceremony at St Mary is taking place.',
      }),
    ]);
  });

  it('places kitchen services and cake mode on their own steps', () => {
    const mapped = mapMandatoryToSteps(wedding, steps, { role: 'mc' });
    expect(mapped.dinner).toEqual([
      expect.objectContaining({ kind: 'kitchenService', key: 'dinner', time: '18:30' }),
    ]);
    expect(mapped.step_05).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cakeServiceMode', mode: 'CUT_IN_PLACE' }),
      ]),
    );
    expect(mapped.supper_2).toEqual([
      expect.objectContaining({ kind: 'kitchenService', key: 'supper_2', mode: 'BUFFET' }),
    ]);
  });

  it('gives DJ VIP no step chips after removing first-arrival', () => {
    const mapped = mapMandatoryToSteps(wedding, steps, { role: 'dj', isVipDj: true });
    expect(mapped).toEqual({});
  });

  it('gives no data to DJ Standard or unrelated roles', () => {
    expect(mapMandatoryToSteps(wedding, steps, { role: 'dj' })).toEqual({});
    expect(mapMandatoryToSteps(wedding, steps, { role: 'photo1' })).toEqual({});
  });

  it('applies step-scoped venue-manager overrides', () => {
    const overridden = steps.map((step) => {
      if (step.id === 'step_01') return { ...step, time: '16:00' };
      if (step.id === 'dinner') {
        return { ...step, time: '19:00', mandatory: { ...step.mandatory, serviceMode: 'BUFFET' } };
      }
      if (step.id === 'step_05') {
        return { ...step, mandatory: { ...step.mandatory, cakeServiceMode: 'KITCHEN_RETURN' } };
      }
      return step;
    });
    const mapped = mapMandatoryToSteps(wedding, overridden, { role: 'mc' });
    expect(mapped.step_01).toBeUndefined();
    expect(mapped.dinner).toEqual([
      expect.objectContaining({ kind: 'kitchenService', time: '19:00', mode: 'BUFFET' }),
    ]);
    expect(mapped.step_05).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cakeServiceMode', mode: 'KITCHEN_RETURN' }),
      ]),
    );
  });

  it('removes the page-level card and renders notes in MC and DJ VIP step bodies', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).not.toContain('MandatoryConstraintsCard');
    expect(deck).toContain('mandatoryOverride={liveState.media_overrides?.steps ?? null}');

    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('<StepMandatoryNotes items={mandatoryItems} showHeading={false} />');
    expect(mc).toContain('mapMandatoryToSteps(WEDDING, steps');

    const dj = read('src/components/DjBoothView.jsx');
    expect(dj).toContain('<StepMandatoryNotes items={mandatoryItems} />');
    expect(dj).toContain("role: 'dj', isVipDj: caps.vip");
  });
});
