import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mapMandatoryToSteps } from '../../src/lib/mandatorySteps.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const wedding = {
  weddingId: '2026-08-20_test',
  mandatorySteps: {
    firstGuestsArrival: '15:30',
    kitchenServices: { dinner: '18:30', secondSupper: '23:30' },
    kitchenServiceModes: { dinner: 'TABLE_SERVICE', secondSupper: 'BUFFET' },
    cakeServiceMode: 'CUT_IN_PLACE',
  },
  ceremony: {
    type: 'RELIGIOUS',
    mcSupportRequested: false,
    location: 'St Mary',
  },
};

const steps = [
  { id: 'step_01', title: 'Cocktail', time: '15:30' },
  { id: 'step_02', title: 'Ceremony', time: '17:00' },
  { id: 'step_03', title: 'Grand Entrance', time: '18:00' },
  { id: 'step_05', title: 'Wedding cake', time: '20:30' },
];

describe('issue #384 mandatory data embedded in steps', () => {
  it('places arrival, prestation and ceremony data on their steps', () => {
    const mapped = mapMandatoryToSteps(wedding, steps, { role: 'mc' });
    expect(mapped.step_01.map((item) => item.kind)).toEqual([
      'firstArrival',
      'prestationReady',
    ]);
    expect(mapped.step_01.map((item) => item.time)).toEqual(['15:30', '14:30']);
    expect(mapped.step_02).toEqual([
      expect.objectContaining({
        kind: 'ceremonyNote',
        text: 'Religious wedding ceremony at St Mary is taking place.',
      }),
    ]);
  });

  it('places kitchen services on the active step and cake mode on cake', () => {
    const mapped = mapMandatoryToSteps(wedding, steps, { role: 'mc' });
    expect(mapped.step_03).toEqual([
      expect.objectContaining({ kind: 'kitchenService', key: 'dinner', time: '18:30' }),
    ]);
    expect(mapped.step_05).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cakeServiceMode', mode: 'CUT_IN_PLACE' }),
        expect.objectContaining({ kind: 'kitchenService', key: 'secondSupper', mode: 'BUFFET' }),
      ]),
    );
  });

  it('limits DJ VIP to the first-arrival milestone', () => {
    const mapped = mapMandatoryToSteps(wedding, steps, { role: 'dj', isVipDj: true });
    expect(mapped.step_01).toEqual([{ kind: 'firstArrival', time: '15:30' }]);
    expect(Object.values(mapped).flat()).toHaveLength(1);
  });

  it('gives no data to DJ Standard or unrelated roles', () => {
    expect(mapMandatoryToSteps(wedding, steps, { role: 'dj' })).toEqual({});
    expect(mapMandatoryToSteps(wedding, steps, { role: 'photo1' })).toEqual({});
  });

  it('applies venue-manager overrides', () => {
    const mapped = mapMandatoryToSteps(wedding, steps, {
      role: 'mc',
      override: {
        value: {
          firstGuestsArrival: '16:00',
          kitchenServices: { dinner: '19:00' },
          kitchenServiceModes: { dinner: 'BUFFET' },
          cakeServiceMode: 'KITCHEN_RETURN',
        },
      },
    });
    expect(mapped.step_01).toEqual([
      { kind: 'firstArrival', time: '16:00' },
      { kind: 'prestationReady', time: '15:00' },
    ]);
    expect(mapped.step_03).toEqual([
      expect.objectContaining({ kind: 'kitchenService', time: '19:00', mode: 'BUFFET' }),
    ]);
  });

  it('removes the page-level card and renders notes in MC and DJ VIP step bodies', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).not.toContain('MandatoryConstraintsCard');
    expect(deck).toContain('mandatoryOverride={liveState.media_overrides?.mandatorySteps ?? null}');

    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('<StepMandatoryNotes items={mandatoryItems} />');
    expect(mc).toContain('mapMandatoryToSteps(WEDDING');

    const dj = read('src/components/DjBoothView.jsx');
    expect(dj).toContain('<StepMandatoryNotes items={mandatoryItems} />');
    expect(dj).toContain("role: 'dj', isVipDj: isVip");
  });
});
