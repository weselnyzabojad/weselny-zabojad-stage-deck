import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import NextMonthStory from '../src/components/social/NextMonthStory.jsx';
import {
  buildNextMonthModel,
  isNextMonthWindow,
  nextMonthCaptionLines,
  nextMonthFileName,
  nextMonthTarget,
} from '../src/lib/socialNextMonth.js';

const wedding = (id, dateISO, extra = {}) => ({
  wedding_id: id,
  bride_name: `Bride ${id}`,
  groom_name: `Groom ${id}`,
  venue_city: 'Warszawa',
  venue_country: 'PL',
  dateISO,
  ...extra,
});

describe('issue #1351 Next month weddings Story', () => {
  it('offers the template only in the last 7 calendar days', () => {
    expect(isNextMonthWindow(new Date('2026-08-25T12:00:00Z'))).toBe(true);
    expect(isNextMonthWindow(new Date('2026-08-31T12:00:00Z'))).toBe(true);
    expect(isNextMonthWindow(new Date('2026-08-24T12:00:00Z'))).toBe(false);
    expect(isNextMonthWindow(new Date('2026-02-22T12:00:00Z'))).toBe(true);
    expect(isNextMonthWindow(new Date('2026-02-21T12:00:00Z'))).toBe(false);
  });

  it('rolls December to January of the next year', () => {
    expect(nextMonthTarget(new Date('2026-12-28T12:00:00Z'))).toEqual({
      year: 2027,
      month: 1,
      iso: '2027-01',
    });
  });

  it('sorts and groups weddings into pages of at most 4', () => {
    const rows = [
      wedding('5', '2026-09-30'),
      wedding('1', '2026-09-01'),
      wedding('4', '2026-09-20'),
      wedding('2', '2026-09-10'),
      wedding('3', '2026-09-15'),
      wedding('6', '2026-09-30'),
    ];
    const model = buildNextMonthModel({
      weddings: rows,
      now: new Date('2026-08-28T12:00:00Z'),
    });
    expect(model.weddings.map((entry) => entry.id)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(model.pages.map((page) => page.weddings.length)).toEqual([4, 2]);
    expect(model.pages[1]).toMatchObject({ page: 2, total: 2 });
  });

  it('handles 0, 1, 4 and 10 weddings and empty months', () => {
    for (const [count, pages] of [
      [0, 0],
      [1, 1],
      [4, 1],
      [10, 3],
    ]) {
      const rows = Array.from({ length: count }, (_, index) =>
        wedding(String(index + 1), `2026-09-${String((index % 28) + 1).padStart(2, '0')}`),
      );
      const model = buildNextMonthModel({ weddings: rows, now: new Date('2026-08-28T12:00:00Z') });
      expect(model.pages, String(count)).toHaveLength(pages);
      if (count > 0) expect(model.hasData).toBe(true);
    }
    const empty = buildNextMonthModel({ weddings: [], now: new Date('2026-08-28T12:00:00Z') });
    expect(empty.hasData).toBe(false);
    expect(nextMonthCaptionLines(empty, 'fr').join('\n')).toContain('Aucun mariage');
  });

  it('renders page indicator, wedding fields and neutral fallbacks', () => {
    const model = buildNextMonthModel({
      weddings: [
        wedding('1', '2026-09-05'),
        wedding('2', '2026-09-06', { bride_name: null, groom_name: null, venue_city: null }),
      ],
      now: new Date('2026-08-28T12:00:00Z'),
    });
    const html = renderToStaticMarkup(
      createElement(NextMonthStory, {
        weddings: model.weddings,
        now: new Date('2026-08-28T12:00:00Z'),
      }),
    );
    expect(html).toContain('1/1');
    expect(html).toContain('Bride 1 &amp; Groom 1');
    expect(html).toContain('Warszawa');
    expect(html).toContain('PL');
    expect(html).toContain('—');
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
  });

  it('keeps FR/PL captions in sync and uses the filename contract', () => {
    const model = buildNextMonthModel({
      weddings: [wedding('1', '2026-09-05')],
      now: new Date('2026-08-28T12:00:00Z'),
    });
    for (const locale of ['fr', 'pl']) {
      const caption = nextMonthCaptionLines(model, locale).join('\n');
      expect(caption).toContain('Bride 1');
      expect(caption).toContain('Groom 1');
      expect(caption).toContain('Warszawa');
      expect(caption).toContain('PL');
      expect(caption).toContain('1/1');
    }
    expect(nextMonthFileName(2026, 9, 1)).toBe('stage-deck-next-month-2026-09-1.png');
  });

  it('is gated by the publication window in the studio', () => {
    const studio = read('src/components/SocialExportStudio.jsx');
    expect(studio).toContain("entry.id === 'nextMonth'");
    expect(studio).toContain('nextMonthModel.available');
    expect(studio).toContain('nextMonthCaptionLines');
  });
});

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}
