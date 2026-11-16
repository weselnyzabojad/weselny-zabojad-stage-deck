import { describe, expect, it } from 'vitest';
import { rescheduleFlexibleStep } from '../src/lib/mandatorySteps.js';
import {
  applyMediaOverride,
  createLiveState,
  normalizeLiveState,
  undoSnapshot,
} from '../src/lib/liveStageState.js';
import { reconcileLiveStateWithCartridge } from '../src/lib/cartridgeReconciliation.js';

const baseSteps = () => [
  { id: 'cocktail', time: '18:00', title: 'Cocktail', type: 'FLEXIBLE' },
  { id: 'toast', time: '19:00', title: 'Toast', type: 'FLEXIBLE' },
  { id: 'dance', time: '19:30', title: 'Dance', type: 'FLEXIBLE' },
  {
    id: 'cake',
    time: '20:30',
    title: 'Wedding cake',
    type: 'HARD_ANCHOR',
    mandatory: { kind: 'CAKE_SERVICE', label: 'Wedding cake' },
  },
  { id: 'after', time: '21:00', title: 'After cake', type: 'FLEXIBLE' },
  {
    id: 'closure',
    time: '02:00',
    title: 'Wedding closure',
    type: 'HARD_ANCHOR',
    mandatory: { kind: 'CLOSURE', label: 'Wedding closure' },
  },
];

const context = {
  now: new Date('2026-08-20T18:00:00.000Z'),
  eventDateISO: '2026-08-20',
  timeZone: 'UTC',
};

const times = (steps) => steps.map((step) => [step.id, step.time]);

describe('issue #1104 MC flexible-step reschedule', () => {
  it('moves the selected step and cascades flexible followers until the next anchor', () => {
    const target = baseSteps()[1];
    const { steps, error, changed } = rescheduleFlexibleStep(
      baseSteps(),
      'toast',
      '19:15',
      { ...context, liveState: { active_step_id: 'cocktail', completed_step_ids: [] } },
    );

    expect(error).toBeNull();
    expect(changed).toBe(true);
    expect(times(steps)).toEqual([
      ['cocktail', '18:00'],
      ['toast', '19:15'],
      ['dance', '19:45'],
      ['cake', '20:30'],
      ['after', '21:00'],
      ['closure', '02:00'],
    ]);
    expect(target.time).toBe('19:00');
  });

  it('rejects hard anchors and mandatory obligations', () => {
    expect(rescheduleFlexibleStep(baseSteps(), 'cake', '21:00', context).error).toMatch(
      /Only flexible steps/,
    );
    expect(rescheduleFlexibleStep(baseSteps(), 'closure', '03:00', context).error).toMatch(
      /Only flexible steps/,
    );

    const mandatoryFlexible = baseSteps().map((step) =>
      step.id === 'toast'
        ? { ...step, mandatory: { kind: 'MILESTONE', label: 'Vendor call' } }
        : step,
    );
    expect(
      rescheduleFlexibleStep(mandatoryFlexible, 'toast', '19:15', context).error,
    ).toMatch(/Mandatory steps/);
  });

  it('rejects the current step, completed steps and past times', () => {
    expect(
      rescheduleFlexibleStep(baseSteps(), 'toast', '19:15', {
        ...context,
        liveState: { active_step_id: 'toast', completed_step_ids: [] },
      }).error,
    ).toMatch(/current step/);

    expect(
      rescheduleFlexibleStep(baseSteps(), 'toast', '19:15', {
        ...context,
        liveState: { active_step_id: 'cocktail', completed_step_ids: ['toast'] },
      }).error,
    ).toMatch(/Completed steps/);

    expect(
      rescheduleFlexibleStep(baseSteps(), 'toast', '17:00', {
        ...context,
        now: new Date('2026-08-20T18:00:00.000Z'),
        liveState: { active_step_id: 'cocktail', completed_step_ids: [] },
      }).error,
    ).toMatch(/future/);
  });

  it('rejects a cascade that would cross the next hard anchor', () => {
    const { steps, error } = rescheduleFlexibleStep(
      baseSteps(),
      'toast',
      '21:30',
      { ...context, liveState: { active_step_id: 'cocktail', completed_step_ids: [] } },
    );
    expect(error).toMatch(/cross a fixed step|invalid or overlapping/);
    expect(steps.find((step) => step.id === 'toast').time).toBe('19:00');
    expect(steps.find((step) => step.id === 'cake').time).toBe('20:30');
  });

  it('is day-aware across midnight', () => {
    const steps = [
      { id: 'toast', time: '23:30', title: 'Toast', type: 'FLEXIBLE' },
      { id: 'dance', time: '23:45', title: 'Dance', type: 'FLEXIBLE' },
      {
        id: 'closure',
        time: '02:00',
        title: 'Wedding closure',
        type: 'HARD_ANCHOR',
        mandatory: { kind: 'CLOSURE', label: 'Wedding closure' },
      },
    ];
    const result = rescheduleFlexibleStep(steps, 'toast', '00:00', {
      now: new Date('2026-08-20T23:00:00.000Z'),
      eventDateISO: '2026-08-20',
      timeZone: 'UTC',
      liveState: { active_step_id: null, completed_step_ids: [] },
    });
    expect(result.error).toBeNull();
    expect(result.steps.find((step) => step.id === 'dance').time).toBe('00:15');
  });

  it('stores author, device and change metadata on the synced override', () => {
    const state = createLiveState(baseSteps());
    const next = applyMediaOverride(
      state,
      'steps',
      baseSteps(),
      { role: 'mc', deviceId: 'device-mc' },
      new Date('2026-08-20T19:15:00.000Z'),
      {
        change: {
          kind: 'reschedule',
          stepId: 'toast',
          stepTitle: 'Toast',
          from: '19:00',
          to: '19:15',
        },
      },
    );

    expect(next.media_overrides.steps).toMatchObject({
      role: 'mc',
      deviceId: 'device-mc',
      change: {
        kind: 'reschedule',
        stepId: 'toast',
        stepTitle: 'Toast',
        from: '19:00',
        to: '19:15',
        authorRole: 'mc',
      },
    });
    expect(next.mutation_log.at(-1).op).toBe('schedule_change');
    expect(next.mutation_log.at(-1).payload.change.stepId).toBe('toast');
  });

  it('undo restores only the steps override and marks the notice as an undo', () => {
    const before = applyMediaOverride(
      createLiveState(baseSteps()),
      'steps',
      baseSteps(),
      { role: 'venue_manager', deviceId: 'device-venue' },
      new Date('2026-08-20T18:30:00.000Z'),
      { change: { kind: 'reschedule', stepId: 'toast', from: '18:45', to: '19:00' } },
    );
    const changed = applyMediaOverride(
      before,
      'steps',
      baseSteps().map((step) => (step.id === 'toast' ? { ...step, time: '19:15' } : step)),
      { role: 'mc', deviceId: 'device-mc' },
      new Date('2026-08-20T19:15:00.000Z'),
      { change: { kind: 'reschedule', stepId: 'toast', from: '19:00', to: '19:15' } },
    );
    const withMedia = applyMediaOverride(
      changed,
      'miniSessionTime',
      '18:30',
      { role: 'photo1', deviceId: 'device-photo' },
      new Date('2026-08-20T19:16:00.000Z'),
    );

    const undone = undoSnapshot(withMedia, before, {
      actor: { role: 'mc', deviceId: 'device-mc' },
      now: new Date('2026-08-20T19:20:00.000Z'),
      targetOp: 'schedule_change',
    });

    expect(undone.media_overrides.steps.change.kind).toBe('undo');
    expect(undone.media_overrides.steps.updatedAt).toBe('2026-08-20T19:20:00.000Z');
    expect(undone.media_overrides.miniSessionTime.value).toBe('18:30');
    expect(undone.media_overrides.steps.value.find((s) => s.id === 'toast').time).toBe(
      '19:00',
    );
  });

  it('keeps the override through cartridge reconciliation and drops removed steps', () => {
    const state = createLiveState(baseSteps());
    const overridden = applyMediaOverride(
      state,
      'steps',
      baseSteps().map((step) => (step.id === 'toast' ? { ...step, time: '19:15' } : step)),
      { role: 'mc', deviceId: 'device-mc' },
      new Date('2026-08-20T19:15:00.000Z'),
      { change: { kind: 'reschedule', stepId: 'toast', from: '19:00', to: '19:15' } },
    );

    const nextSteps = [
      ...baseSteps().filter((step) => step.id !== 'dance'),
      { id: 'new_step', time: '22:00', title: 'New step', type: 'FLEXIBLE' },
    ];
    const result = reconcileLiveStateWithCartridge({
      liveState: overridden,
      steps: nextSteps,
    });

    expect(result.state.media_overrides.steps.value.map((step) => step.id)).toEqual([
      'cocktail',
      'toast',
      'cake',
      'after',
      'closure',
      'new_step',
    ]);
    expect(result.state.media_overrides.steps.value.find((step) => step.id === 'toast').time).toBe(
      '19:15',
    );
    expect(result.state.media_overrides.steps.change.stepId).toBe('toast');

    const removedTarget = reconcileLiveStateWithCartridge({
      liveState: overridden,
      steps: baseSteps().filter((step) => step.id !== 'toast'),
    });
    expect(removedTarget.state.media_overrides.steps.change).toBeUndefined();
  });

  it('normalizes and preserves change metadata', () => {
    const normalized = normalizeLiveState(
      {
        ...createLiveState(baseSteps()),
        media_overrides: {
          steps: {
            value: baseSteps(),
            updatedAt: '2026-08-20T19:15:00.000Z',
            role: 'mc',
            deviceId: 'device-mc',
            change: { kind: 'reschedule', stepId: 'toast', from: '19:00', to: '19:15' },
          },
        },
      },
      baseSteps(),
    );
    expect(normalized.media_overrides.steps.change).toEqual({
      kind: 'reschedule',
      stepId: 'toast',
      from: '19:00',
      to: '19:15',
    });
  });
});
