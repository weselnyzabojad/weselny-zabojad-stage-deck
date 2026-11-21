import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DayPlusOneStory from '../src/components/social/DayPlusOneStory.jsx';
import {
  buildDayPlusOneModel,
  dayPlusOneCaptionLines,
} from '../src/lib/socialDayPlusOne.js';

const wedding = {
  venue_name: 'Dwor',
  venue_city: 'Warszawa',
  cartridge: {
    date: '2026-08-20',
    extensions: { dateISO: '2026-08-20', languages: { hostLanguages: ['PL', 'FR'] } },
    steps: [{ id: 'step_01', time: '17:00', title: 'Ceremony' }],
  },
};
const recap = {
  summary: {
    firstActualStart: '17:05',
    lastActualStart: '23:00',
    actualEnd: '02:00',
    actualDurationMinutes: 535,
    totalSteps: 1,
    completedSteps: 1,
    gameCount: 2,
  },
  timeline: [],
  games: [
    {
      title: 'Test Wiedzy',
      questions: [
        { id: 'q1', isCompatible: true },
        { id: 'q2', isCompatible: false },
      ],
    },
    { title: 'Test Zgodności', questions: [] },
  ],
};
const requests = [
  { song: 'Perfect', artist: 'Ed Sheeran', status: 'pending' },
  { song: 'Perfect', artist: 'Ed Sheeran', status: 'accepted' },
  { song: 'Dancing Queen', artist: 'ABBA', status: 'pending' },
];

describe('issue #1341 Day +1 admin data enrichment', () => {
  it('renders real timing, top request and game results only in admin mode', () => {
    const admin = renderToStaticMarkup(
      createElement(DayPlusOneStory, { wedding, recap, requests, surface: 'admin' }),
    );
    expect(admin).toContain('17:05');
    expect(admin).toContain('23:00');
    expect(admin).toContain('02:00');
    expect(admin).toContain('535');
    expect(admin).toContain('Perfect — Ed Sheeran');
    expect(admin).toContain('Test Wiedzy 50% (2)');
    expect(admin).toContain('Test Zgodności —% (0)');
    expect(admin).not.toContain('Dwor');
    expect(admin).not.toContain('Warszawa');

    const mc = renderToStaticMarkup(
      createElement(DayPlusOneStory, { wedding, recap, requests, surface: 'mc' }),
    );
    expect(mc).not.toContain('Perfect — Ed Sheeran');
    expect(mc).not.toContain('Test Wiedzy 50%');
  });

  it('prefers accepted requests and is deterministic on ties', () => {
    const model = buildDayPlusOneModel({
      wedding,
      recap,
      requests,
      surface: 'admin',
    });
    expect(model.admin.topRequest).toMatchObject({
      title: 'Perfect',
      artist: 'Ed Sheeran',
      count: 1,
    });

    const tie = buildDayPlusOneModel({
      wedding,
      recap,
      requests: [
        { song: 'Zulu', artist: 'B', status: 'pending' },
        { song: 'Alpha', artist: 'A', status: 'pending' },
      ],
      surface: 'admin',
    });
    expect(tie.admin.topRequest).toMatchObject({ title: 'Alpha', artist: 'A' });
  });

  it('shows neutral states without a recap or requests', () => {
    const model = buildDayPlusOneModel({
      wedding,
      recap: null,
      requests: [],
      surface: 'admin',
    });
    expect(model.admin.firstActualStart).toBeNull();
    expect(model.admin.topRequest).toBeNull();
    expect(model.admin.games).toEqual([]);
    expect(dayPlusOneCaptionLines(model, 'fr').join('\n')).not.toContain('NaN');
  });

  it('keeps FR/PL captions in sync and preserves existing KPIs', () => {
    const model = buildDayPlusOneModel({ wedding, recap, requests, surface: 'admin' });
    for (const locale of ['fr', 'pl']) {
      const caption = dayPlusOneCaptionLines(model, locale).join('\n');
      expect(caption).toContain('17:05');
      expect(caption).toContain('23:00');
      expect(caption).toContain('535');
      expect(caption).toContain('Perfect');
      expect(caption).toContain('Test Wiedzy 50% (2)');
    }
    expect(model.completedSteps).toBe(1);
    expect(model.compatibilityPct).toBe(50);
    expect(model.cultural.stoLat).toBeNull();
  });
});
