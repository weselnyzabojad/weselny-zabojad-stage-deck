import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PhotographerView from '../../src/components/PhotographerView.jsx';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';
import { resolveSunset } from '../../src/lib/photoPlan.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const render = (wedding, role = 'photo1') =>
  renderToStaticMarkup(
    createElement(PhotographerView, {
      wedding,
      timeline: [],
      clock: { now: new Date('2026-11-07T12:00:00Z') },
      role,
      theme: 'night',
      onToggleTheme: () => {},
    }),
  );

describe('issue #311 photographer sunset UI', () => {
  it('keeps the sunset card visible on desktop and pocket sources', () => {
    const photo = read('src/components/PhotographerView.jsx');
    expect(photo).toContain('photo.sunsetGolden');
    expect(photo).toContain('photo.lightWindows');
    expect(photo).toContain('photo.goldenHour');
    expect(photo).toContain('photo.civilTwilight');
  });

  it('renders sunset data for Photographer 1/2 and Cameraman', () => {
    for (const role of ['photo1', 'photo2', 'video']) {
      const html = render(DEMO_WEDDING, role);
      expect(html).toContain('Sunset &amp; golden hour');
      expect(html).toContain('20:12');
      expect(html).toContain('19:32');
      expect(html).toContain('20:48');
    }
  });

  it('shows unavailable state instead of removing the card', () => {
    const wedding = {
      ...DEMO_WEDDING,
      photoPlan: { ...DEMO_WEDDING.photoPlan, sunset: { status: 'UNAVAILABLE' } },
    };
    const html = render(wedding);
    expect(html).toContain('Sunset &amp; golden hour');
    expect(html).toContain('Sunset unavailable');
  });

  it('does not hide the card when the event date is not today', () => {
    expect(resolveSunset(DEMO_WEDDING)?.usable).toBe(true);
    expect(render(DEMO_WEDDING)).toContain('Mini session latest start');
  });

  it('only completes the mini session on its actual event day', () => {
    const photo = read('src/components/PhotographerView.jsx');
    expect(photo).toContain('miniSessionCompleted');
    expect(photo).toContain('isEventDay');
    expect(photo).not.toContain('Boolean(miniSessionEnd && now.getTime() > miniSessionEnd.getTime())');
  });
});
