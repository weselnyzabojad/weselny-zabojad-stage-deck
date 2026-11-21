import { describe, expect, it } from 'vitest';
import {
  addCustomStep,
  buildTimelineDocRows,
  createTimelineDraft,
  deleteCustomStep,
  excludeCanonicalStep,
  readdCanonicalStep,
  serviceDayMinutes,
  updateTimelineRow,
  validateTimelineDraft,
} from '../supabase/functions/_shared/timelineModel.js';

const steps = () => [
  {
    id: 'step_01',
    time: '16:00',
    title: "Vin d'honneur / Cocktail",
    type: 'FLEXIBLE',
    location: 'Venue',
    mandatory: { kind: 'FIRST_GUESTS_ARRIVAL' },
  },
  {
    id: 'step_03',
    time: '18:00',
    title: 'Grand Entrance',
    type: 'FLEXIBLE',
    location: 'Venue',
    dj: { track: 'Song' },
    subTasks: ['Mic'],
  },
  {
    id: 'step_09',
    time: '00:00',
    title: 'Oczepiny',
    type: 'HARD_ANCHOR',
    location: 'Venue',
    optionalFlag: 'oczepiny',
  },
  {
    id: 'custom_1',
    time: '17:00',
    title: 'Custom moment',
    type: 'FLEXIBLE',
    location: 'Venue',
  },
  {
    id: 'closure',
    time: '02:00',
    title: 'Wedding closure',
    type: 'HARD_ANCHOR',
    location: 'Venue',
    mandatory: { kind: 'CLOSURE' },
  },
];

describe('issue #1375 timeline model', () => {
  it('classifies mandatory, canonical and custom rows', () => {
    const draft = createTimelineDraft(steps());
    expect(draft.rows.find((row) => row.id === 'step_01')).toMatchObject({
      kind: 'mandatory',
      boundary: 'arrival',
      locked: true,
    });
    expect(draft.rows.find((row) => row.id === 'closure')).toMatchObject({
      kind: 'mandatory',
      boundary: 'closure',
    });
    expect(draft.rows.find((row) => row.id === 'step_03')).toMatchObject({
      kind: 'canonical',
      editable: { title: false, hour: true },
    });
    expect(draft.rows.find((row) => row.id === 'custom_1')).toMatchObject({
      kind: 'custom',
      location: 'Venue',
    });
  });

  it('locks mandatory rows and canonical titles', () => {
    const draft = createTimelineDraft(steps());
    const locked = updateTimelineRow(draft, 'step_01', { time: '15:00', title: 'Changed' });
    expect(locked.rows.find((row) => row.id === 'step_01').title).toBe('Vin d\'honneur / Cocktail');
    expect(locked.rows.find((row) => row.id === 'step_01').time).toBe('16:00');

    const canonical = updateTimelineRow(draft, 'step_03', { time: '18:15', title: 'Changed' });
    expect(canonical.rows.find((row) => row.id === 'step_03').title).toBe('Grand Entrance');
    expect(canonical.rows.find((row) => row.id === 'step_03').time).toBe('18:15');
  });

  it('excludes a canonical step with linked-data metadata and re-adds from defaults', () => {
    const draft = createTimelineDraft(steps());
    const { draft: excluded, linked } = excludeCanonicalStep(draft, 'step_03');
    expect(linked).toMatchObject({ dj: true, subtasks: true });
    expect(excluded.rows.some((row) => row.id === 'step_03')).toBe(false);
    expect(excluded.excludedCanonical).toContain('step_03');

    const readded = readdCanonicalStep(excluded, 'step_03');
    expect(readded.rows.find((row) => row.id === 'step_03')).toMatchObject({
      time: '18:00',
      linked: { dj: false, subtasks: false },
    });
  });

  it('adds and deletes custom steps with stable IDs', () => {
    const draft = createTimelineDraft(steps());
    const added = addCustomStep(draft, { title: 'Photo break', time: '19:15', note: 'Garden' });
    const newRow = added.rows.find((row) => row.title === 'Photo break');
    expect(newRow).toMatchObject({ kind: 'custom', location: 'Venue', note: 'Garden' });
    const deleted = deleteCustomStep(added, newRow.id);
    expect(deleted.rows.some((row) => row.id === newRow.id)).toBe(false);
  });

  it('sorts by service-day clock with midnight rollover', () => {
    const draft = createTimelineDraft(steps());
    expect(draft.rows.map((row) => row.time)).toEqual([
      '16:00',
      '17:00',
      '18:00',
      '00:00',
      '02:00',
    ]);
    expect(serviceDayMinutes('00:00')).toBeGreaterThan(serviceDayMinutes('23:50'));
    expect(serviceDayMinutes('05:59')).toBeGreaterThan(serviceDayMinutes('01:00'));
  });

  it('blocks invalid hours and empty custom titles, and warns on soft issues', () => {
    let draft = createTimelineDraft(steps());
    draft = addCustomStep(draft, { title: '', time: '25:99' });
    draft = updateTimelineRow(draft, 'step_03', { time: '15:00' });
    draft = updateTimelineRow(draft, 'custom_1', { time: '15:00' });
    const { errors, warnings } = validateTimelineDraft(draft);
    expect(errors.some((error) => error.code === 'invalid_hour')).toBe(true);
    expect(errors.some((error) => error.code === 'empty_title')).toBe(true);
    expect(warnings.some((warning) => warning.code === 'duplicate_time')).toBe(true);
    expect(warnings.some((warning) => warning.code === 'before_arrival')).toBe(true);
  });

  it('builds exact Doc rows without mandatory bookends', () => {
    const draft = createTimelineDraft(steps());
    expect(buildTimelineDocRows(draft)).toEqual([
      { Hour: '17:00', 'Step name': 'Custom moment', 'Example values': '' },
      {
        Hour: '18:00',
        'Step name': 'Grand Entrance',
        'Example values': 'Guest order, entrance music',
      },
      {
        Hour: '00:00',
        'Step name': 'Oczepiny',
        'Example values': 'Toss, ties, winner photo, music',
      },
    ]);
  });
});
