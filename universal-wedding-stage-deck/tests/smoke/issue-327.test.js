import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MandatoryUpdatePopup from '../../src/components/MandatoryUpdatePopup.jsx';

const update = {
  updatedAt: '2026-11-07T18:00:00.000Z',
  value: [
    {
      id: 'step_arrival',
      time: '15:30',
      title: 'First guests arrival',
      type: 'HARD_ANCHOR',
      mandatory: { kind: 'FIRST_GUESTS_ARRIVAL', label: 'First guests arrival' },
    },
    {
      id: 'dinner',
      time: '18:30',
      title: 'Dinner',
      type: 'HARD_ANCHOR',
      mandatory: { kind: 'KITCHEN_SERVICE', label: 'Dinner', serviceMode: 'TABLE_SERVICE' },
    },
    {
      id: 'supper_1',
      time: '21:30',
      title: 'Supper I',
      type: 'HARD_ANCHOR',
      mandatory: { kind: 'KITCHEN_SERVICE', label: 'Supper I', serviceMode: 'TABLE_SERVICE' },
    },
    {
      id: 'supper_2',
      time: '23:30',
      title: 'Supper II',
      type: 'HARD_ANCHOR',
      mandatory: { kind: 'KITCHEN_SERVICE', label: 'Supper II', serviceMode: 'BUFFET' },
    },
    {
      id: 'cake',
      time: '20:30',
      title: 'Wedding cake',
      type: 'HARD_ANCHOR',
      mandatory: { kind: 'CAKE_SERVICE', label: 'Wedding cake', cakeServiceMode: 'KITCHEN_RETURN' },
    },
    {
      id: 'closure',
      time: '02:00',
      title: 'Wedding closure',
      type: 'HARD_ANCHOR',
      mandatory: {
        kind: 'CLOSURE',
        label: 'Wedding closure',
        closureExtensionAllowed: true,
        closureExtensionUntil: '03:00',
        lastSong: 'Perfect - Ed Sheeran',
      },
    },
  ],
};

const render = (role, isVipDj = false) =>
  renderToStaticMarkup(
    createElement(MandatoryUpdatePopup, {
      weddingId: 'w1',
      role,
      isVipDj,
      update,
    }),
  );

describe('issue #327 mandatory update popup role visibility', () => {
  it('shows MC the complete constraint set and buffet mode', () => {
    const html = render('mc');
    expect(html).toContain('First guests arrival: 15:30');
    expect(html).toContain('Prestation ready (derived): 14:30');
    expect(html).toContain('Dinner · Table service: 18:30');
    expect(html).toContain('Supper II · Buffet: 23:30');
    expect(html).toContain('Cake service: Kitchen return / plated pieces');
    expect(html).not.toContain('Last song:');
  });

  it('shows DJ VIP first arrival and closure/last-song fields only', () => {
    const html = render('dj', true);
    expect(html).toContain('First guests arrival: 15:30');
    expect(html).toContain('Wedding closure: 02:00');
    expect(html).toContain('Closure extension: Until 03:00');
    expect(html).toContain('Last song: Perfect - Ed Sheeran');
    expect(html).not.toContain('Dinner');
    expect(html).not.toContain('Cake service');
  });

  it('never exposes restricted data to other roles', () => {
    for (const role of ['dj_standard', 'photo1', 'photo2', 'video', 'speaker', 'venue_manager']) {
      expect(render(role)).toBe('');
    }
  });

  it('does not render when no permitted fields remain', () => {
    const empty = {
      updatedAt: '2026-11-07T18:00:00.000Z',
      value: [
        {
          id: 'dinner',
          time: '18:30',
          title: 'Dinner',
          type: 'HARD_ANCHOR',
          mandatory: { kind: 'KITCHEN_SERVICE', label: 'Dinner', serviceMode: 'TABLE_SERVICE' },
        },
      ],
    };
    const html = renderToStaticMarkup(
      createElement(MandatoryUpdatePopup, {
        weddingId: 'w1',
        role: 'dj',
        isVipDj: true,
        update: empty,
      }),
    );
    expect(html).toBe('');
  });
});
