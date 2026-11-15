import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildEndHours, endHourSortValue, formatEndHour } from '../src/lib/endHours.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const wedding = {
  musicians: {
    items: [
      {
        id: 'anna',
        name: 'Anna',
        instrument: 'violin',
        startTime: '15:00',
        endTime: '21:00',
        active: true,
      },
      {
        id: 'piotr',
        name: 'Piotr',
        instrument: 'saxophone',
        startTime: '22:00',
        endTime: '00:30',
        active: true,
      },
      {
        id: 'inactive',
        name: 'Inactive',
        instrument: 'piano',
        endTime: '20:00',
        active: false,
      },
    ],
  },
  mediaTeam: [
    { id: 'photo', role: 'PHOTO', name: 'Magda', startTime: '14:00', endTime: '21:30' },
    { id: 'video', role: 'VIDEO', name: 'Ola', startTime: '14:30', endTime: '23:15' },
    { id: 'no-end', role: 'PHOTO2', name: 'No end' },
  ],
};

describe('issue #991 DJ Standard end-hour card', () => {
  it('builds one sorted list from musicians and media-team end times', () => {
    const rows = buildEndHours(wedding);
    expect(rows.map((row) => row.name)).toEqual(['Anna', 'Magda', 'Ola', 'Piotr']);
    expect(rows[0]).toMatchObject({ role: 'Musician', instrument: 'violin', endTime: '21:00' });
    expect(rows[1]).toMatchObject({ role: 'Photographer', name: 'Magda' });
    expect(rows[2]).toMatchObject({ role: 'Cameraman', name: 'Ola' });
  });

  it('sorts a cross-midnight end after every same-evening departure', () => {
    expect(endHourSortValue('22:00', '00:30')).toBeGreaterThan(endHourSortValue('14:30', '23:15'));
    expect(formatEndHour({ startTime: '22:00', endTime: '00:30' })).toBe('22:00–00:30');
  });

  it('hides the card when no end hours exist', () => {
    expect(buildEndHours({})).toEqual([]);
    expect(buildEndHours({ mediaTeam: [{ role: 'PHOTO', name: 'No end' }] })).toEqual([]);
  });

  it('renders a single read-only card only for the Standard DJ tier', () => {
    const view = read('src/components/DjBoothView.jsx');
    expect(view).toContain("import EndHoursCard from './EndHoursCard'");
    expect(view).toContain('{!caps.vip ? <EndHoursCard wedding={wedding} /> : null}');
    expect(view.match(/<EndHoursCard/g)).toHaveLength(2);

    const card = read('src/components/EndHoursCard.jsx');
    expect(card).toContain('<section');
    expect(card).toContain('<ul');
    expect(card).toContain('buildEndHours(wedding)');
    expect(card).not.toContain('fetch(');
    expect(card).not.toContain('.from(');

    const helper = read('src/lib/endHours.js');
    expect(helper).not.toContain('fetch(');
    expect(helper).not.toContain('.from(');
  });

  it('has localized labels for all three locales', () => {
    for (const locale of ['en', 'fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      expect(dict).toContain("'dj.endHours.title'");
      expect(dict).toContain("'dj.endHours.count'");
      expect(dict).toContain("'dj.endHours.hint'");
      expect(dict).toContain("'dj.endHours.leavesAt'");
    }
  });
});
