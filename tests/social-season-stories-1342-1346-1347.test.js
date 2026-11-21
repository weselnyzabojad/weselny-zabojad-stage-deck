import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MonthStory from '../src/components/social/MonthStory.jsx';
import BeforeSeasonStory from '../src/components/social/BeforeSeasonStory.jsx';
import {
  buildBeforeSeasonModel,
  buildMonthModel,
  buildSeasonModel,
  beforeSeasonCaptionLines,
  monthCaptionLines,
  seasonCaptionLines,
} from '../src/lib/socialSeason.js';
import { SOCIAL_TEMPLATES } from '../src/lib/socialStory.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const monthData = {
  seasonYear: 2026,
  month: {
    month: 8,
    year: 2026,
    hasData: true,
    guests: { total: 240, pl: 120, fr: 90, other: 30 },
    compatibility: { averagePercent: 72, answered: 48, total: 60 },
  },
};
const seasonData = {
  seasonYear: 2026,
  coverage: { weddings: 12 },
  kpis: {
    destinations: [
      { country: 'PL', weddings: 7 },
      { country: 'FR', weddings: 4 },
    ],
    stolatWeddings: 9,
    compatibility: {
      averagePercent: 71,
      answered: 300,
      total: 420,
      weddings: 12,
      topQuestion: { percent: 88 },
    },
  },
  seasonPlan: {
    state: 'post',
    weddings: { total: 14, completed: 12, upcoming: 0 },
    guests: { planned: 1800, completed: 1500 },
    destinations: [
      { country: 'PL', planned: 8, completed: 7 },
      { country: 'FR', planned: 5, completed: 4 },
    ],
  },
  nextWedding: null,
};

describe('season lifecycle stories (#1342, #1346, #1347)', () => {
  it('registers Month, Before season and Season templates for the admin', () => {
    const ids = SOCIAL_TEMPLATES.map((entry) => entry.id);
    expect(ids).toEqual(expect.arrayContaining(['month', 'beforeSeason', 'season']));
    for (const id of ['month', 'beforeSeason', 'season']) {
      expect(SOCIAL_TEMPLATES.find((entry) => entry.id === id).surfaces).toEqual(['admin']);
    }
  });

  it('builds and captions the Month Story from the durable month block', () => {
    const model = buildMonthModel(monthData);
    expect(model).toMatchObject({
      month: 8,
      year: 2026,
      hasData: true,
      guests: { total: 240, pl: 120, fr: 90, other: 30 },
      averagePercent: 72,
      answered: 48,
      total: 60,
    });
    for (const locale of ['fr', 'pl']) {
      const caption = monthCaptionLines(model, locale).join('\n');
      expect(caption).toContain('240');
      expect(caption).toContain('72%');
      expect(caption).toContain('48/60');
    }
    const html = renderToStaticMarkup(createElement(MonthStory, { seasonData: monthData }));
    expect(html).toContain('8/2026');
    expect(html).toContain('240');
  });

  it('shows a neutral Month empty state without zeros or NaN', () => {
    const model = buildMonthModel({ seasonYear: 2026, month: { month: 12, hasData: false } });
    expect(model.hasData).toBe(false);
    expect(monthCaptionLines(model, 'fr').join('\n')).not.toContain('NaN');
    const html = renderToStaticMarkup(
      createElement(MonthStory, { seasonData: { month: { month: 12, hasData: false } } }),
    );
    expect(html).toContain('Pas encore de données');
  });

  it('offers Before season only before the season starts', () => {
    const before = {
      seasonYear: 2026,
      seasonPlan: {
        weddings: { completed: 0, upcoming: 3 },
        destinations: [{ country: 'PL', planned: 2 }, { country: 'FR', planned: 1 }],
      },
      nextWedding: { daysUntil: 42 },
    };
    const model = buildBeforeSeasonModel(before);
    expect(model).toMatchObject({ available: true, destinations: 2, daysUntil: 42 });
    const caption = beforeSeasonCaptionLines(model, 'fr').join('\n');
    expect(caption).toContain('2 destinations');
    expect(caption).toContain('J−42');
    const html = renderToStaticMarkup(
      createElement(BeforeSeasonStory, { seasonData: before }),
    );
    expect(html).toContain('J−42');
    expect(html).toContain('PL');

    const post = buildBeforeSeasonModel({
      seasonPlan: { weddings: { completed: 2, upcoming: 0 }, destinations: [] },
    });
    expect(post.available).toBe(false);
    expect(beforeSeasonCaptionLines(post, 'fr').join('\n')).toContain('indisponible');
  });

  it('gates Season until the last planned wedding', () => {
    const model = buildSeasonModel(seasonData);
    expect(model.available).toBe(true);
    expect(model).toMatchObject({
      planned: 14,
      completed: 12,
      upcoming: 0,
      destinations: 2,
      stolatWeddings: 9,
    });
    const caption = seasonCaptionLines(model, 'fr').join('\n');
    expect(caption).toContain('12 mariages terminés');
    expect(caption).toContain('2 destinations');
    expect(caption).toContain('Sto Lat : 9');
    expect(caption).toContain('71%');

    const pre = buildSeasonModel({
      seasonPlan: { weddings: { total: 3, completed: 0, upcoming: 3 } },
    });
    expect(pre.available).toBe(false);
    expect(seasonCaptionLines(pre, 'fr').join('\n')).toContain('pas encore terminée');
  });

  it('hides the Season tab before it is available and keeps month data separate', () => {
    const studio = read('src/components/SocialExportStudio.jsx');
    expect(studio).toContain("if (entry.id === 'season') return seasonModel.available;");
    expect(studio).toContain("if (entry.id === 'nextMonth') return nextMonthModel.available;");
    expect(studio).toContain("month: MonthStory");
    expect(studio).toContain("beforeSeason: BeforeSeasonStory");
    expect(studio).toContain('monthCaptionLines');
    expect(studio).toContain('beforeSeasonCaptionLines');

    const studioAdmin = read('src/admin/AdminSocialStudio.jsx');
    expect(studioAdmin).toContain('month: period.month');
    expect(studioAdmin).toContain('socialPeriod(selected)');
  });

  it('never renders identity data in the lifecycle captions', () => {
    for (const caption of [
      monthCaptionLines(buildMonthModel(monthData), 'fr').join('\n'),
      beforeSeasonCaptionLines(
        buildBeforeSeasonModel({
          seasonPlan: { weddings: { completed: 0, upcoming: 1 }, destinations: [{ country: 'PL' }] },
          nextWedding: { daysUntil: 10 },
        }),
        'fr',
      ).join('\n'),
      seasonCaptionLines(buildSeasonModel(seasonData), 'fr').join('\n'),
    ]) {
      expect(caption).not.toContain('Anna');
      expect(caption).not.toContain('Dwor');
      expect(caption).not.toContain('ul. Lipowa');
    }
  });
});
