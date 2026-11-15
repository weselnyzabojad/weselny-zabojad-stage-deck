import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildEndHours, lanePositionPercent } from '../src/lib/endHours.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const wedding = {
  musicians: {
    items: [
      { id: 'anna', name: 'Anna', instrument: 'violin', startTime: '15:00', endTime: '21:00', active: true },
      { id: 'piotr', name: 'Piotr', instrument: 'saxophone', startTime: '22:00', endTime: '00:30', active: true },
    ],
  },
  mediaTeam: [
    { id: 'photo', role: 'PHOTO', name: 'Magda', endTime: '21:30' },
    { id: 'video', role: 'VIDEO', name: 'Ola', endTime: '23:15' },
  ],
};

describe('issue #995 DJ VIP parallel end-hour lane', () => {
  it('positions markers by end clock on a 24-hour rail', () => {
    expect(lanePositionPercent(0)).toBe(0);
    expect(lanePositionPercent(720)).toBe(50);
    expect(lanePositionPercent(1439)).toBeCloseTo(99.93, 1);
    expect(lanePositionPercent(1440)).toBe(0);
  });

  it('orders multiple markers and generalizes beyond musicians', () => {
    const rows = buildEndHours(wedding);
    expect(rows.map((row) => row.name)).toEqual(['Anna', 'Magda', 'Ola', 'Piotr']);
    expect(rows[0].instrument).toBe('violin');
    expect(rows.map((row) => row.role)).toContain('Photographer');
    expect(rows.map((row) => row.role)).toContain('Cameraman');
  });

  it('renders the lane only for VIP in both layouts', () => {
    const view = read('src/components/DjBoothView.jsx');
    expect(view).toContain("import DjEndHourLane from './DjEndHourLane'");
    expect(view.match(/\{caps\.vip \? <DjEndHourLane wedding=\{wedding\} \/> : null\}/g)).toHaveLength(2);
    expect(view).toContain('{!caps.vip ? <EndHoursCard wedding={wedding} /> : null}');
  });

  it('keeps markers visually separate from timeline calculations', () => {
    const lane = read('src/components/DjEndHourLane.jsx');
    expect(lane).toContain('data-testid="dj-end-hour-lane"');
    expect(lane).toContain('border-dashed');
    expect(lane).toContain('<ol');
    expect(lane).toContain('aria-label=');
    expect(lane).not.toContain('StageStepCard');
    expect(lane).not.toContain('TimelineFocusStack');
    expect(lane).not.toContain('driftEngine');
    expect(lane).not.toContain('stageRail');

    const helper = read('src/lib/endHours.js');
    expect(helper).not.toContain('driftEngine');
    expect(helper).not.toContain('steps');
  });

  it('has localized labels for all locales', () => {
    for (const locale of ['en', 'fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      expect(dict).toContain("'dj.endHourLane.title'");
      expect(dict).toContain("'dj.endHourLane.hint'");
    }
  });
});
