import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DayMinusOneStory from '../src/components/social/DayMinusOneStory.jsx';
import SocialExportStudio from '../src/components/SocialExportStudio.jsx';
import {
  buildDayMinusOneModel,
  dayMinusOneCaptionLines,
  venueTodayISO,
} from '../src/lib/socialDayMinusOne.js';

const wedding = {
  wedding_id: 'w1',
  date: '20.08.2026',
  timezone: 'Europe/Warsaw',
  venue_country: 'PL',
  roles: ['mc', 'dj', 'photo1', 'video'],
  cartridge: {
    extensions: {
      dateISO: '2026-08-20',
      timeZone: 'Europe/Warsaw',
      languages: { supported: ['PL', 'FR', 'EN'] },
    },
    steps: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    hardAnchors: [{ id: 'cake_service' }],
  },
};

const liveState = {
  media_overrides: {
    venuePolicies: {
      decibelLimitEnabled: true,
      decibelLimit: 95,
      forbiddenFx: ['smoke', 'sparks'],
    },
  },
};

const render = (props = {}) =>
  renderToStaticMarkup(createElement(DayMinusOneStory, { wedding, liveState, ...props }));

describe('issue #1255 Day -1 Prep Wrapper template', () => {
  it('activates the badge only on the venue-local event date minus one', () => {
    const model = buildDayMinusOneModel({
      wedding,
      liveState,
      now: new Date('2026-08-19T10:00:00+02:00'),
    });
    expect(model.targetDateISO).toBe('2026-08-19');
    expect(model.readyToPost).toBe(true);

    const early = buildDayMinusOneModel({
      wedding,
      liveState,
      now: new Date('2026-08-18T23:30:00+02:00'),
    });
    expect(early.readyToPost).toBe(false);
  });

  it('uses the venue timezone around midnight and DST boundaries', () => {
    // 22:30 UTC is already the next day in Warsaw.
    expect(venueTodayISO('Europe/Warsaw', new Date('2026-08-18T22:30:00Z'))).toBe('2026-08-19');
    expect(venueTodayISO('UTC', new Date('2026-08-18T22:30:00Z'))).toBe('2026-08-18');
    const model = buildDayMinusOneModel({
      wedding,
      liveState,
      now: new Date('2026-08-18T22:30:00Z'),
    });
    expect(model.readyToPost).toBe(true);
  });

  it('derives country, languages, steps, roles and armed policy', () => {
    const model = buildDayMinusOneModel({
      wedding,
      liveState,
      now: new Date('2026-08-19T10:00:00Z'),
    });
    expect(model.country).toBe('PL');
    expect(model.languages).toEqual(['PL', 'FR', 'EN']);
    expect(model.stepCount).toBe(3);
    expect(model.roleCount).toBe(4);
    expect(model.hardAnchorCount).toBe(1);
    expect(model.policy).toEqual({ armed: true, decibelLimit: 95, forbiddenFx: 2 });
  });

  it('keeps missing values empty and never claims curfew compliance', () => {
    const model = buildDayMinusOneModel({
      wedding: { cartridge: { extensions: {} } },
      now: new Date('2026-08-19T10:00:00Z'),
    });
    expect(model.country).toBeNull();
    expect(model.languages).toEqual([]);
    expect(model.stepCount).toBe(0);
    expect(model.readyToPost).toBe(false);
    expect(model.policy).toEqual({ armed: false, decibelLimit: null, forbiddenFx: 0 });
    const html = render({ wedding: { cartridge: { extensions: {} } }, liveState: null });
    expect(html).not.toMatch(/curfew|couvre-feu|godzina policyjna/i);
  });

  it('renders the anonymized card and never a surname, address or note', () => {
    const html = render();
    expect(html).toContain('PL');
    expect(html).toContain('PL · FR · EN');
    expect(html).toContain('95 dB');
    expect(html).toContain('2 FX bloqués');
    expect(html).not.toContain('Dwór');
    expect(html).not.toContain('ul.');
    expect(html).not.toContain('@');
    expect(html).not.toContain('note');
  });

  it('builds FR and PL captions from the same values', () => {
    const model = buildDayMinusOneModel({
      wedding,
      liveState,
      now: new Date('2026-08-19T10:00:00Z'),
    });
    const fr = dayMinusOneCaptionLines(model, 'fr').join('\n');
    const pl = dayMinusOneCaptionLines(model, 'pl').join('\n');
    expect(fr).toContain('J−1 avant le mariage — PL');
    expect(fr).toContain('3 étapes verrouillées');
    expect(pl).toContain('D−1 przed weselem — PL');
    expect(pl).toContain('3 kroków zablokowanych');
  });

  it('is wired into the Studio with its captions', () => {
    const html = renderToStaticMarkup(
      createElement(SocialExportStudio, {
        surface: 'mc',
        wedding,
        liveState,
      }),
    );
    expect(html).toContain('PL');
    expect(html).toContain('Copy FR caption');
    expect(html).toContain('Copy PL caption');
    expect(html).not.toContain('Template content is being prepared');
  });
});
