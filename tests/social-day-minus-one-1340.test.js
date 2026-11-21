import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DayMinusOneStory from '../src/components/social/DayMinusOneStory.jsx';
import {
  buildDayMinusOneModel,
  dayMinusOneCaptionLines,
} from '../src/lib/socialDayMinusOne.js';

const wedding = {
  venue_name: 'Dwor Pod Lipami',
  venue_city: 'Warszawa',
  venue_address: 'ul. Lipowa 12',
  vipDjName: 'DJ Mark',
  cartridge: {
    date: '2026-08-20',
    extensions: { dateISO: '2026-08-20', languages: { supported: ['PL', 'FR'] } },
    coupleProfile: {
      bride: { firstName: 'Anna', nationalities: ['PL'] },
      groom: { firstName: 'Piotr', nationalities: ['FR'] },
    },
    demographics: { total: 120, pl: 80, fr: 30, other: 10 },
    childrenExpected: true,
    culturalRules: {
      sto_lat: { status: 'YES' },
      gorzko: { status: 'IF_GUESTS_START' },
      bread_salt: { status: 'YES' },
    },
    servicePackage: 'HOST_AND_DJ_VIP',
    steps: [{ id: 'step_01', time: '17:00', title: 'Ceremony' }],
  },
};

describe('issue #1340 Day -1 admin data enrichment', () => {
  it('renders couple, venue, guests, rituals and package only in admin mode', () => {
    const admin = renderToStaticMarkup(
      createElement(DayMinusOneStory, { wedding, surface: 'admin' }),
    );
    expect(admin).toContain('Anna');
    expect(admin).toContain('Piotr');
    expect(admin).toContain('fi-pl');
    expect(admin).toContain('fi-fr');
    expect(admin).toContain('Dwor Pod Lipami, Warszawa');
    expect(admin).toContain('Guests: 120');
    expect(admin).toContain('Sto Lat YES');
    expect(admin).toContain('Gorzko IF_GUESTS_START');
    expect(admin).toContain('Bread &amp; Salt YES');
    expect(admin).toContain('Package HOST AND DJ VIP');
    expect(admin).toContain('DJ Mark');
    expect(admin).not.toContain('ul. Lipowa 12');

    const mc = renderToStaticMarkup(
      createElement(DayMinusOneStory, { wedding, surface: 'mc' }),
    );
    expect(mc).not.toContain('Anna');
    expect(mc).not.toContain('Dwor Pod Lipami');
    expect(mc).not.toContain('DJ Mark');
  });

  it('uses localized empty states instead of zero or NaN', () => {
    const model = buildDayMinusOneModel({
      wedding: { cartridge: {} },
      surface: 'admin',
    });
    expect(model.admin.guests.total).toBeNull();
    expect(model.admin.bride.firstName).toBeNull();
    expect(model.admin.venueName).toBeNull();
    expect(dayMinusOneCaptionLines(model, 'fr').join('\n')).toContain('Invités : —');
    expect(dayMinusOneCaptionLines(model, 'fr').join('\n')).not.toContain('NaN');
  });

  it('keeps FR/PL captions in sync with the admin card', () => {
    const model = buildDayMinusOneModel({ wedding, surface: 'admin' });
    for (const locale of ['fr', 'pl']) {
      const caption = dayMinusOneCaptionLines(model, locale).join('\n');
      expect(caption).toContain('Anna');
      expect(caption).toContain('Piotr');
      expect(caption).toContain('Dwor Pod Lipami');
      expect(caption).toContain('120');
      expect(caption).toContain('Sto Lat YES');
      expect(caption).toContain('HOST AND DJ VIP');
      expect(caption).toContain('DJ Mark');
    }
    const mc = buildDayMinusOneModel({ wedding, surface: 'mc' });
    expect(dayMinusOneCaptionLines(mc, 'fr').join('\n')).not.toContain('Anna');
  });

  it('keeps the existing KPIs and does not duplicate the new data', () => {
    const model = buildDayMinusOneModel({ wedding, surface: 'admin' });
    expect(model.stepCount).toBe(1);
    expect(model.roleCount).toBe(0);
    expect(model.policy).toBeTruthy();
  });
});
