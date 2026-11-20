import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import MusicalSetBar from '../src/components/MusicalSetBar.jsx';
import { extendMusicalSet } from '../src/lib/musicalSet.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const step = (id, time, type = 'FLEXIBLE', extra = {}) => ({
  id,
  time,
  title: id,
  type,
  location: '',
  ...extra,
});

const setSteps = () => [
  step('musical', '22:00', 'FLEXIBLE', { optionalFlag: 'dj_set' }),
  step('dishes', '22:15', 'HARD_ANCHOR'),
  step('dance', '22:45'),
  step('anchor', '01:00', 'HARD_ANCHOR'),
  step('closure', '02:00', 'HARD_ANCHOR', {
    mandatory: { kind: 'CLOSURE', label: 'Wedding closure' },
  }),
];

const wedding = { dateISO: '2026-08-20' };
const clock = (time) => ({ now: new Date(`2026-08-20T${time}:00Z`), timeZone: 'UTC' });
const renderBar = (now, projectedEnd = '22:30') =>
  renderToStaticMarkup(
    createElement(MusicalSetBar, {
      wedding,
      clock: clock(now),
      activeEntry: {
        step: { id: 'musical', optionalFlag: 'dj_set' },
        projectedEnd,
      },
      onExtend: () => ({ canExtend: false, reason: 'notAllowed' }),
      extensionAllowed: true,
      extensionUntil: '03:00',
      closureTime: '02:00',
    }),
  );

describe('issue #913 Musical Set VIP bar and extension', () => {
  it('extends the next step and consecutive flexible steps by 60 minutes', () => {
    const { canExtend, steps, reason } = extendMusicalSet(setSteps(), 'musical', {
      extensionAllowed: true,
      extensionUntil: '03:00',
      closureTime: '02:00',
    });
    expect(reason).toBeNull();
    expect(canExtend).toBe(true);
    expect(steps.map((entry) => [entry.id, entry.time])).toEqual([
      ['musical', '22:00'],
      ['dishes', '23:15'],
      ['dance', '23:45'],
      ['anchor', '01:00'],
      ['closure', '02:00'],
    ]);
    expect(steps.every((entry) => !('durationMin' in entry))).toBe(true);
  });

  it('is day-aware across midnight', () => {
    const steps = [
      step('musical', '23:00', 'FLEXIBLE', { optionalFlag: 'dj_set' }),
      step('dishes', '23:15', 'HARD_ANCHOR'),
      step('dance', '23:45'),
      step('closure', '02:00', 'HARD_ANCHOR', {
        mandatory: { kind: 'CLOSURE', label: 'Wedding closure' },
      }),
    ];
    const result = extendMusicalSet(steps, 'musical', {
      extensionAllowed: true,
      extensionUntil: '03:00',
      closureTime: '02:00',
    });
    expect(result.canExtend).toBe(true);
    expect(result.steps.find((entry) => entry.id === 'dishes').time).toBe('00:15');
    expect(result.steps.find((entry) => entry.id === 'dance').time).toBe('00:45');
  });

  it('blocks when the extension would cross the next later hard anchor', () => {
    const steps = [
      step('musical', '22:00', 'FLEXIBLE', { optionalFlag: 'dj_set' }),
      step('dishes', '22:15', 'HARD_ANCHOR'),
      step('dance', '23:30'),
      step('anchor', '00:00', 'HARD_ANCHOR'),
      step('closure', '02:00', 'HARD_ANCHOR', {
        mandatory: { kind: 'CLOSURE', label: 'Wedding closure' },
      }),
    ];
    const result = extendMusicalSet(steps, 'musical', {
      extensionAllowed: true,
      extensionUntil: '03:00',
      closureTime: '02:00',
    });
    expect(result.canExtend).toBe(false);
    expect(result.reason).toBe('crossesAnchor');
    expect(result.steps.find((entry) => entry.id === 'dance').time).toBe('23:30');
  });

  it('is disabled without an authorized usable window', () => {
    expect(
      extendMusicalSet(setSteps(), 'musical', {
        extensionAllowed: false,
        extensionUntil: '03:00',
        closureTime: '02:00',
      }).reason,
    ).toBe('notAllowed');
    expect(
      extendMusicalSet(setSteps(), 'musical', {
        extensionAllowed: true,
        extensionUntil: null,
        closureTime: '02:00',
      }).reason,
    ).toBe('noWindow');
  });

  it('renders countdown warnings with timer semantics', () => {
    expect(renderBar('22:20')).toContain('role="timer"');
    expect(renderBar('22:20')).toContain('10:00');
    expect(renderBar('22:20')).toContain('amber-600');
    expect(renderBar('22:26')).toContain('animate-pulse');
    expect(renderBar('22:26')).toContain('motion-reduce:animate-none');
  });

  it('keeps PLAY/STOP local and gates the bar to VIP surfaces', () => {
    const bar = read('src/components/MusicalSetBar.jsx');
    expect(bar).toContain('setRunning');
    expect(bar).not.toContain('setMediaOverride');
    const dj = read('src/components/DjBoothView.jsx');
    expect(dj).toContain('caps.vip && isDjSet ?');
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('djMc && activeMusicalSetEntry ?');
    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain("setMediaOverride('steps', result.steps)");
    expect(deck).toContain('extendMusicalSet(steps, liveState.active_step_id');
  });
});
