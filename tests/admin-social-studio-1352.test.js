import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { firstUpcomingWedding, socialPeriod } from '../src/admin/socialPeriod.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1352 Admin Social Media Studio tab', () => {
  it('adds the Social Media Studio tab after Overview', () => {
    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain("['social', 'Social Media Studio']");
    expect(app.indexOf("['overview', 'Overview']")).toBeLessThan(
      app.indexOf("['social', 'Social Media Studio']"),
    );
    expect(app).toContain("import AdminSocialStudio from './AdminSocialStudio';");
    expect(app).toContain("tab === 'social'");
    expect(app).toContain('<AdminSocialStudio');
  });

  it('selects the first upcoming wedding and exposes both selectors', () => {
    const rows = [
      { wedding_id: 'past', dateISO: '2026-01-01' },
      { wedding_id: 'later', dateISO: '2026-09-10' },
      { wedding_id: 'first', dateISO: '2026-08-20' },
    ];
    expect(firstUpcomingWedding(rows, new Date('2026-07-01T00:00:00Z'))).toMatchObject({
      wedding_id: 'first',
    });
    expect(socialPeriod({ dateISO: '2026-08-20' })).toEqual({ year: 2026, month: 8 });
    expect(socialPeriod({ date: '20.08.2026' })).toEqual({ year: 2026, month: 8 });
    expect(socialPeriod({})).toEqual({ year: null, month: null });

    const studio = read('src/admin/AdminSocialStudio.jsx');
    expect(studio).toContain('firstUpcomingWedding(weddings)');
    expect(studio).toContain('Wedding');
    expect(studio).toContain('Season');
    expect(studio).toContain('useSocialData({ row: selected');
    expect(studio).toContain('useSeasonStats({');
    expect(studio).toContain('No upcoming wedding is available');
    expect(studio).toContain('Read-only: preview and export only.');
  });

  it('registers all admin templates in one place', () => {
    const studio = read('src/components/SocialExportStudio.jsx');
    for (const key of [
      'dayMinusOne: DayMinusOneStory',
      'dayPlusOne: DayPlusOneStory',
      'month: MonthStory',
      'nextMonth: NextMonthStory',
      'beforeSeason: BeforeSeasonStory',
      'season: SeasonStory',
    ]) {
      expect(studio).toContain(key);
    }
  });

  it('removes the per-row Social shortcut and inline studio', () => {
    const overview = read('src/admin/AdminPortfolioOverview.jsx');
    expect(overview).not.toContain('SocialExportStudio');
    expect(overview).not.toContain('useSocialData');
    expect(overview).not.toContain('useSeasonStats');
    expect(overview).not.toContain('socialRow');
    expect(overview).not.toContain('onSocial');
    expect(overview).not.toContain("social.open");
  });
});
