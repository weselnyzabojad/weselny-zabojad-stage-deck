import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  adjacentStepId,
  isDevPreviewRequested,
  previewStepState,
} from '../src/lib/devPreview.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #761 local-only dev step preview state', () => {
  it('enables preview only for ?dev=1', () => {
    expect(isDevPreviewRequested('?dev=1')).toBe(true);
    expect(isDevPreviewRequested('?foo=bar&dev=1')).toBe(true);
    expect(isDevPreviewRequested('?dev=0')).toBe(false);
    expect(isDevPreviewRequested('?dev=true')).toBe(false);
    expect(isDevPreviewRequested('?role=mc')).toBe(false);
    expect(isDevPreviewRequested('')).toBe(false);
    expect(isDevPreviewRequested(null)).toBe(false);
  });

  it('makes the selected step active and removes it from completed', () => {
    const steps = [{ id: 'step_01' }, { id: 'step_02' }, { id: 'step_03' }];
    const state = {
      active_step_id: 'step_01',
      completed_step_ids: ['step_01', 'step_02'],
      actual_timestamps: { step_01: '2026-08-20T16:31:00+02:00' },
      checked_subtasks: { 'Subtask A': true },
      step_order: ['step_01', 'step_02', 'step_03'],
      active_speech_id: 'speech_witness',
      media_overrides: { miniSessionTime: { value: '19:00' } },
      game_results: { test_wiedzy: { answeredCount: 3 } },
      mutation_log: [{ id: 'm1', op: 'complete_step' }],
    };

    const next = previewStepState(state, 'step_02', steps);

    expect(next).not.toBe(state);
    expect(next.active_step_id).toBe('step_02');
    expect(next.completed_step_ids).toEqual(['step_01']);
    expect(next.actual_timestamps).toEqual(state.actual_timestamps);
    expect(next.checked_subtasks).toEqual(state.checked_subtasks);
    expect(next.step_order).toEqual(state.step_order);
    expect(next.active_speech_id).toBe(state.active_speech_id);
    expect(next.media_overrides).toEqual(state.media_overrides);
    expect(next.game_results).toEqual(state.game_results);
    expect(next.mutation_log).toEqual(state.mutation_log);
    expect(state.completed_step_ids).toEqual(['step_01', 'step_02']);
  });

  it('ignores unknown or empty step ids', () => {
    const steps = [{ id: 'step_01' }];
    const state = { active_step_id: 'step_01', completed_step_ids: [] };

    expect(previewStepState(state, 'missing', steps)).toBe(state);
    expect(previewStepState(state, '', steps)).toBe(state);
    expect(previewStepState(null, 'step_01', steps)).toBeNull();
  });

  it('resolves previous/next without wrapping', () => {
    const steps = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

    expect(adjacentStepId(steps, 'b', 1)).toBe('c');
    expect(adjacentStepId(steps, 'b', -1)).toBe('a');
    expect(adjacentStepId(steps, 'a', -1)).toBeNull();
    expect(adjacentStepId(steps, 'c', 1)).toBeNull();
    expect(adjacentStepId(steps, 'missing', 1)).toBeNull();
    expect(adjacentStepId([], 'a', 1)).toBeNull();
    expect(adjacentStepId(steps, 'b', 0)).toBeNull();
  });

  it('disables sync and persistence while preview is active', () => {
    const hook = read('src/hooks/useLiveStageState.js');

    expect(hook).toContain('const canSync =');
    expect(hook).toContain('!preview &&');
    expect(hook).toContain('if (preview) return;');
    expect(hook).toContain('if (preview) return undefined;');
    expect(hook).toContain('const devJumpToStep = useCallback(');
    expect(hook).toContain('previewStepState(state, stepId, steps)');
  });

  it('wires the preview gate into the deck behind import.meta.env.DEV', () => {
    const deck = read('src/StageDeck.jsx');

    expect(deck).toContain('import { isDevPreviewRequested }');
    expect(deck).toContain('const DEV_PREVIEW =');
    expect(deck).toContain('import.meta.env.DEV &&');
    expect(deck).toContain('preview: DEV_PREVIEW,');
  });
});
