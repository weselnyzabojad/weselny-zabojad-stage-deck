import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createLiveState,
  normalizeGameResults,
  normalizeLiveState,
  undoSnapshot,
  updateGameResult,
} from '../../src/lib/liveStageState.js';
import { buildGameResultsExport } from '../../src/lib/games.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const steps = [{ id: 'step_01' }, { id: 'step_02' }];
const sample = {
  gameId: 'test_zgodnosci',
  startedAt: '2026-08-20T23:20:00.000Z',
  updatedAt: '2026-08-20T23:25:00.000Z',
  completedAt: null,
  totalQuestions: 12,
  answeredCount: 3,
  score: 2,
  questions: {
    z01: { answeredAt: '2026-08-20T23:20:00.000Z', isCompatible: true },
    z02: { answeredAt: '2026-08-20T23:21:00.000Z', isCompatible: false },
    z03: { answeredAt: '2026-08-20T23:22:00.000Z', isCompatible: true },
  },
};

describe('issue #471 persisted game results', () => {
  it('creates and normalizes game_results safely', () => {
    expect(createLiveState(steps).game_results).toEqual({});
    expect(normalizeGameResults(null)).toEqual({});
    expect(normalizeGameResults('bad')).toEqual({});
    expect(normalizeGameResults({ test_wiedzy: { questions: 'bad' } })).toEqual({
      test_wiedzy: {
        gameId: 'test_wiedzy',
        startedAt: null,
        updatedAt: null,
        completedAt: null,
        totalQuestions: 0,
        answeredCount: 0,
        questions: {},
      },
    });
    const normalized = normalizeGameResults({ test_zgodnosci: sample });
    expect(normalized.test_zgodnosci).toMatchObject({
      gameId: 'test_zgodnosci',
      answeredCount: 3,
      score: 2,
      totalQuestions: 12,
    });
    expect(normalized.test_zgodnosci.questions.z02.isCompatible).toBe(false);
  });

  it('drops invalid question entries without throwing', () => {
    const normalized = normalizeGameResults({
      test_wiedzy: {
        questions: {
          w01: { revealed: true },
          w02: { answeredAt: 'not-a-date' },
          w03: { answeredAt: '2026-08-20T23:00:00.000Z', revealed: true },
        },
      },
    });
    expect(Object.keys(normalized.test_wiedzy.questions)).toEqual(['w03']);
    expect(normalized.test_wiedzy.answeredCount).toBe(1);
  });

  it('preserves results through live-state normalisation', () => {
    const state = normalizeLiveState(
      {
        active_step_id: 'step_01',
        completed_step_ids: [],
        step_order: ['step_01', 'step_02'],
        game_results: { test_zgodnosci: sample },
      },
      steps,
    );
    expect(state.game_results.test_zgodnosci.score).toBe(2);
  });

  it('clears only one game and survives timeline undo', () => {
    const state = createLiveState(steps);
    const withResults = updateGameResult(state, 'test_zgodnosci', sample);
    expect(Object.keys(withResults.game_results)).toEqual(['test_zgodnosci']);

    const cleared = updateGameResult(withResults, 'test_zgodnosci', null);
    expect(cleared.game_results).toEqual({});

    const withTwo = updateGameResult(
      updateGameResult(state, 'test_wiedzy', {
        ...sample,
        gameId: 'test_wiedzy',
        questions: { w01: { answeredAt: '2026-08-20T23:00:00.000Z', revealed: true } },
      }),
      'test_zgodnosci',
      sample,
    );
    const undone = undoSnapshot(withTwo, {
      active_step_id: 'step_02',
      completed_step_ids: ['step_01'],
      actual_timestamps: {},
      checked_subtasks: {},
      step_order: ['step_01', 'step_02'],
      active_speech_id: null,
    });
    expect(undone.game_results.test_wiedzy).toBeDefined();
    expect(undone.game_results.test_zgodnosci.score).toBe(2);
  });

  it('exports the documented JSON shape', () => {
    const exported = buildGameResultsExport({
      weddingId: '2026-08-20_test',
      game: { id: 'test_zgodnosci', title: 'Test Zgodności', gameType: 'TEST_ZGODNOSCI', items: [1, 2] },
      result: sample,
    });
    expect(exported).toMatchObject({
      weddingId: '2026-08-20_test',
      gameId: 'test_zgodnosci',
      gameType: 'TEST_ZGODNOSCI',
      score: 2,
      answeredCount: 3,
    });
    expect(Object.keys(exported.questions)).toEqual(['z01', 'z02', 'z03']);
  });

  it('persists through the overlay and exposes an export action', () => {
    const overlay = read('src/components/GameClickerOverlay.jsx');
    expect(overlay).toContain('onResultsChange(game.id');
    expect(overlay).toContain("onResultsChange(game?.id ?? null, null)");
    expect(overlay).toContain("t('game.export')");
    expect(overlay).toContain('buildGameResultsExport');
    const hook = read('src/hooks/useLiveStageState.js');
    expect(hook).toContain('updateGameResult');
    expect(hook).toContain('undo: false');
  });

  it('validates game_results in the schema without a database table', async () => {
    const example = JSON.parse(read('schema/wedding-cartridge.example.json'));
    const withResults = {
      ...example,
      liveSyncState: {
        ...(example.liveSyncState ?? {}),
        game_results: { test_zgodnosci: sample },
      },
    };
    expect(await validateCartridge(withResults)).toEqual([]);
    expect(read('supabase/schema.sql')).not.toContain('game_results');
    expect(read('src/lib/liveStageState.js')).toContain('game_results: normalizeGameResults');
  });
});
