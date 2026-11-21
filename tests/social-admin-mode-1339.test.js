import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DayMinusOneStory from '../src/components/social/DayMinusOneStory.jsx';
import DayPlusOneStory from '../src/components/social/DayPlusOneStory.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const wedding = {
  cartridge: {
    date: '2026-08-20',
    extensions: { dateISO: '2026-08-20', languages: { supported: ['PL', 'FR'] } },
    steps: [{ id: 'step_01', time: '17:00', title: 'Ceremony' }],
  },
  venue_country: 'PL',
  roles: ['mc'],
};
const recap = { summary: { totalSteps: 1, completedSteps: 1 }, timeline: [], games: [] };

describe('issue #1339 admin-only Social Story rendering mode', () => {
  it('passes the surface to every story template', () => {
    const studio = read('src/components/SocialExportStudio.jsx');
    expect(studio.match(/surface=\{surface\}/g)).toHaveLength(3);
  });

  it('renders an admin mode marker only for the admin surface', () => {
    const admin = renderToStaticMarkup(
      createElement(DayMinusOneStory, { wedding, surface: 'admin' }),
    );
    const mc = renderToStaticMarkup(
      createElement(DayMinusOneStory, { wedding, surface: 'mc' }),
    );
    expect(admin).toContain('data-admin-mode="true"');
    expect(mc).toContain('data-admin-mode="false"');

    const plusAdmin = renderToStaticMarkup(
      createElement(DayPlusOneStory, { wedding, recap, surface: 'admin' }),
    );
    const plusMc = renderToStaticMarkup(
      createElement(DayPlusOneStory, { wedding, recap, surface: 'mc' }),
    );
    expect(plusAdmin).toContain('data-admin-mode="true"');
    expect(plusMc).toContain('data-admin-mode="false"');
  });

  it('keeps the MC story content, KPIs and captions unchanged', () => {
    const mc = renderToStaticMarkup(
      createElement(DayMinusOneStory, { wedding, surface: 'mc' }),
    );
    expect(mc).toContain('Préparation');
    expect(mc).toContain('Étapes');
    expect(mc).toContain('Rôles');
    expect(mc).toContain('Politique du lieu');
    expect(mc).toContain('Stage Deck');
  });

  it('accepts an explicit admin mode without fetching new fields in MC', () => {
    const minus = read('src/components/social/DayMinusOneStory.jsx');
    const plus = read('src/components/social/DayPlusOneStory.jsx');
    for (const file of [minus, plus]) {
      expect(file).toContain("surface = 'mc'");
      expect(file).toContain("const adminMode = surface === 'admin'");
      expect(file).toContain('data-admin-mode');
    }
  });
});
