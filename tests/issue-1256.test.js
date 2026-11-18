import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DayPlusOneStory from '../src/components/social/DayPlusOneStory.jsx';
import SocialExportStudio from '../src/components/SocialExportStudio.jsx';
import {
  buildDayPlusOneModel,
  dayPlusOneCaptionLines,
} from '../src/lib/socialDayPlusOne.js';

const wedding = {
  dateISO: '2026-08-20',
  timezone: 'Europe/Warsaw',
  eventComplete: true,
  scheduleChangeCount: 3,
  requestsAccepted: 12,
  requestsPlayed: 10,
  gameCount: 2,
  compatibilityPct: 78,
  onTimePct: 88,
  biggestDelayMinutes: 14,
  languages: ['PL', 'FR'],
  details: { cultural: { stoLat: 'YES', gorzko: 'IF_GUESTS_START' } },
};

const recap = {
  summary: {
    totalSteps: 10,
    completedSteps: 10,
    scheduleChangeCount: 3,
  },
  timeline: [
    { actualStart: '17:05', driftMinutes: 5 },
    { actualStart: '18:00', driftMinutes: 0 },
    { actualStart: '19:20', driftMinutes: 20 },
  ],
  games: [{ questions: [{ isCompatible: true }, { isCompatible: false }] }],
};

const render = (props = {}) =>
  renderToStaticMarkup(createElement(DayPlusOneStory, { wedding, recap, ...props }));

describe('issue #1256 Day +1 Post-Event Wrapped template', () => {
  it('unlocks after completion or event date plus one', () => {
    expect(
      buildDayPlusOneModel({
        wedding: { ...wedding, eventComplete: true },
        recap,
        now: new Date('2026-08-20T20:00:00+02:00'),
      }).unlocked,
    ).toBe(true);

    const dateOnly = buildDayPlusOneModel({
      wedding: {
        ...wedding,
        eventComplete: false,
        requestsAccepted: null,
        requestsPlayed: null,
        gameCount: null,
        compatibilityPct: null,
        scheduleChangeCount: null,
      },
      now: new Date('2026-08-22T10:00:00+02:00'),
    });
    expect(dateOnly.targetDateISO).toBe('2026-08-21');
    expect(dateOnly.unlocked).toBe(true);

    const tooEarly = buildDayPlusOneModel({
      wedding: { ...wedding, eventComplete: false },
      now: new Date('2026-08-20T23:00:00+02:00'),
    });
    expect(tooEarly.unlocked).toBe(false);
  });

  it('reads real timing, changes, requests and compatibility', () => {
    const model = buildDayPlusOneModel({ wedding, recap, now: new Date('2026-08-22T10:00:00Z') });
    expect(model.totalSteps).toBe(10);
    expect(model.completedSteps).toBe(10);
    expect(model.completionPct).toBe(100);
    expect(model.onTimePct).toBe(67);
    expect(model.biggestDelayMinutes).toBe(20);
    expect(model.scheduleChangeCount).toBe(3);
    expect(model.requestsAccepted).toBe(12);
    expect(model.compatibilityPct).toBe(50);
    expect(model.cultural).toEqual({ stoLat: 'YES', gorzko: 'IF_GUESTS_START' });
  });

  it('never invents curfew, mic or backstage compliance metrics', () => {
    const model = buildDayPlusOneModel({ wedding, recap });
    const serialized = JSON.stringify(model);
    for (const forbidden of ['curfew', 'mic', 'backstage', 'compliance']) {
      expect(serialized.toLowerCase()).not.toContain(forbidden);
    }
    const html = render();
    expect(html.toLowerCase()).not.toContain('curfew');
    expect(html.toLowerCase()).not.toContain('micro');
  });

  it('renders missing metrics as an em dash, not zero', () => {
    const html = render({
      wedding: { dateISO: '2026-08-20', eventComplete: false },
      recap: null,
    });
    expect(html).toContain('—');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('>0<');
  });

  it('keeps identity out of the card and caption', () => {
    const html = render({ wedding: { ...wedding, couple: 'Secret & Person' } });
    expect(html).not.toContain('Secret');
    expect(html).not.toContain('@');
    const model = buildDayPlusOneModel({ wedding, recap });
    expect(dayPlusOneCaptionLines(model, 'fr').join(' ')).not.toContain('Secret');
    expect(dayPlusOneCaptionLines(model, 'pl').join(' ')).not.toContain('Secret');
  });

  it('builds matching FR and PL captions', () => {
    const model = buildDayPlusOneModel({ wedding, recap });
    const fr = dayPlusOneCaptionLines(model, 'fr').join('\n');
    const pl = dayPlusOneCaptionLines(model, 'pl').join('\n');
    expect(fr).toContain('10/10 étapes');
    expect(fr).toContain('67% à l’heure');
    expect(pl).toContain('10/10 kroków');
    expect(pl).toContain('67% na czas');
  });

  it('is wired into the Studio instead of the placeholder', () => {
    const html = renderToStaticMarkup(
      createElement(SocialExportStudio, { surface: 'mc', wedding, recap }),
    );
    expect(html).toContain('Post-Event Wrapped');
    expect(html).not.toContain('Template content is being prepared');
  });
});
