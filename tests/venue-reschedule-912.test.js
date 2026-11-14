import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  applyMandatorySettings,
  cascadeFlexibleSteps,
  settingsFromSteps,
} from '../src/lib/mandatorySteps.js';
import { buildTimeline } from '../src/lib/driftEngine.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const baseSteps = () => [
  {
    id: 'dinner',
    time: '18:30',
    title: 'Dinner',
    type: 'HARD_ANCHOR',
    location: 'Main Hall',
    mandatory: { kind: 'KITCHEN_SERVICE', label: 'Dinner', serviceMode: 'TABLE_SERVICE' },
  },
  { id: 'toast', time: '19:00', title: 'Toast', type: 'FLEXIBLE', location: 'Main Hall' },
  { id: 'dance', time: '19:30', title: 'Dance', type: 'FLEXIBLE', location: 'Main Hall' },
  {
    id: 'cake',
    time: '20:30',
    title: 'Wedding cake',
    type: 'HARD_ANCHOR',
    location: 'Terrace',
    mandatory: { kind: 'CAKE_SERVICE', label: 'Wedding cake' },
  },
  { id: 'after', time: '21:00', title: 'After cake', type: 'FLEXIBLE', location: 'Hall' },
  {
    id: 'closure',
    time: '02:00',
    title: 'Wedding closure',
    type: 'HARD_ANCHOR',
    location: 'Hall',
    mandatory: { kind: 'CLOSURE', label: 'Wedding closure' },
  },
];

const rescheduleDinner = (steps, time) => {
  const settings = settingsFromSteps(steps);
  const nextSettings = {
    ...settings,
    kitchenServices: settings.kitchenServices.map((course) =>
      course.id === 'dinner' ? { ...course, time } : course,
    ),
  };
  return cascadeFlexibleSteps(
    steps,
    applyMandatorySettings({ steps }, nextSettings, { sort: false }),
  );
};

describe('issue #912 Venue Manager reschedule cascade', () => {
  it('shifts consecutive flexible steps by +15 minutes and stops at the next anchor', () => {
    const { steps, error } = rescheduleDinner(baseSteps(), '18:45');
    expect(error).toBeNull();
    expect(steps.map((step) => [step.id, step.time])).toEqual([
      ['dinner', '18:45'],
      ['toast', '19:15'],
      ['dance', '19:45'],
      ['cake', '20:30'],
      ['after', '21:00'],
      ['closure', '02:00'],
    ]);
  });

  it('keeps steps before the edited step unchanged', () => {
    const steps = [
      { id: 'arrival', time: '15:30', title: 'Arrival', type: 'FLEXIBLE', location: '' },
      ...baseSteps(),
    ];
    const { steps: rescheduled } = rescheduleDinner(steps, '18:45');
    expect(rescheduled[0].time).toBe('15:30');
  });

  it('rejects a cascade that would cross the next hard anchor', () => {
    const { steps, error } = rescheduleDinner(baseSteps(), '21:45');
    expect(error).toMatch(/cross a fixed step|invalid or overlapping/);
    expect(steps.find((step) => step.id === 'toast').time).toBe('19:00');
    expect(steps.find((step) => step.id === 'cake').time).toBe('20:30');
  });

  it('is day-aware across midnight', () => {
    const steps = [
      {
        id: 'dinner',
        time: '23:30',
        title: 'Dinner',
        type: 'HARD_ANCHOR',
        location: '',
        mandatory: { kind: 'KITCHEN_SERVICE', label: 'Dinner', serviceMode: 'TABLE_SERVICE' },
      },
      { id: 'toast', time: '23:45', title: 'Toast', type: 'FLEXIBLE', location: '' },
      {
        id: 'closure',
        time: '02:00',
        title: 'Wedding closure',
        type: 'HARD_ANCHOR',
        location: '',
        mandatory: { kind: 'CLOSURE', label: 'Wedding closure' },
      },
    ];
    const { steps: rescheduled, error } = rescheduleDinner(steps, '00:00');
    expect(error).toBeNull();
    expect(rescheduled.find((step) => step.id === 'toast').time).toBe('00:15');
  });

  it('does not cascade a first-guests-arrival edit', () => {
    const steps = [
      {
        id: 'first_guests_arrival',
        time: '15:30',
        title: 'First guests arrival',
        type: 'HARD_ANCHOR',
        location: '',
        mandatory: { kind: 'FIRST_GUESTS_ARRIVAL', label: 'First guests arrival' },
      },
      { id: 'toast', time: '16:00', title: 'Toast', type: 'FLEXIBLE', location: '' },
      {
        id: 'closure',
        time: '02:00',
        title: 'Wedding closure',
        type: 'HARD_ANCHOR',
        location: '',
        mandatory: { kind: 'CLOSURE', label: 'Wedding closure' },
      },
    ];
    const settings = settingsFromSteps(steps);
    const next = applyMandatorySettings(
      { steps },
      { ...settings, firstGuestsArrival: '15:45' },
      { sort: false },
    );
    const { steps: rescheduled, error } = cascadeFlexibleSteps(steps, next);
    expect(error).toBeNull();
    expect(rescheduled.find((step) => step.id === 'toast').time).toBe('16:00');
  });

  it('writes no durationMin and derives durations from the new times', () => {
    const { steps } = rescheduleDinner(baseSteps(), '18:45');
    expect(steps.every((step) => !('durationMin' in step))).toBe(true);
    const entries = buildTimeline(steps);
    expect(entries.find((entry) => entry.step.id === 'toast').durationMin).toBe(30);
  });

  it('syncs through the existing media override path', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain("onUpdateMandatory={(nextSteps) => setMediaOverride('steps', nextSteps)}");
    expect(deck).toContain('mandatoryOverride={liveState.media_overrides?.steps ?? null}');
    const view = read('src/components/VenueManagerView.jsx');
    expect(view).toContain('cascadeFlexibleSteps');
    expect(view).toContain('onUpdateMandatory?.(rescheduled.steps)');
  });
});
