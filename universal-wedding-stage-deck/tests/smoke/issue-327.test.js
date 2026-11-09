import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MandatoryUpdatePopup from '../../src/components/MandatoryUpdatePopup.jsx';

const update = {
  updatedAt: '2026-11-07T18:00:00.000Z',
  value: {
    firstGuestsArrival: '15:30',
    kitchenServices: {
      dinner: '18:30',
      firstSupper: '21:30',
      secondSupper: '23:30',
    },
    kitchenServiceModes: {
      dinner: 'TABLE_SERVICE',
      firstSupper: 'TABLE_SERVICE',
      secondSupper: 'BUFFET',
    },
    cakeServiceMode: 'KITCHEN_RETURN',
    closureTime: '02:00',
    closureExtensionAllowed: true,
    closureExtensionUntil: '03:00',
    lastSong: 'Perfect - Ed Sheeran',
  },
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
    expect(html).toContain('Obiad weselny · Table service: 18:30');
    expect(html).toContain('Druga kolacja · Buffet: 23:30');
    expect(html).toContain('Cake service: Kitchen return / plated pieces');
    expect(html).not.toContain('Last song:');
  });

  it('shows DJ VIP first arrival and closure/last-song fields only', () => {
    const html = render('dj', true);
    expect(html).toContain('First guests arrival: 15:30');
    expect(html).toContain('Wedding closure: 02:00');
    expect(html).toContain('Closure extension: Until 03:00');
    expect(html).toContain('Last song: Perfect - Ed Sheeran');
    expect(html).not.toContain('Obiad weselny');
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
      value: { kitchenServices: { dinner: '18:30' } },
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
