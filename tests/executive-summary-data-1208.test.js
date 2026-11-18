import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compatibilityQuestionText } from '../src/lib/gameCompatibility.js';
import { normalizeLiveState } from '../src/lib/liveStageState.js';
import {
  buildCompatibilitySummary,
  buildWeddingRecap,
} from '../src/lib/weddingRecap.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const wedding = {
  weddingId: 'W-UM-2026-08-001',
  date: '20.08.2026',
  timezone: 'UTC',
  steps: [
    { id: 'a', time: '18:00', title: 'Arrival' },
    {
      id: 'game',
      time: '21:00',
      title: 'Test Zgodności',
      game: { id: 'g', title: 'Test Zgodności', gameType: 'TEST_ZGODNOSCI' },
    },
    { id: 'close', time: '22:00', title: 'Close', mandatory: { kind: 'CLOSURE' } },
  ],
};

const liveState = {
  active_step_id: 'close',
  completed_step_ids: ['a'],
  actual_timestamps: { a: '18:05', close: '22:10' },
  game_results: {
    g: {
      startedAt: '2026-08-20T20:00:00.000Z',
      completedAt: '2026-08-20T20:10:00.000Z',
      totalQuestions: 2,
      answeredCount: 2,
      questions: {
        q1: {
          answeredAt: '2026-08-20T20:01:00.000Z',
          isCompatible: true,
          questionText: 'Do you agree?',
        },
        q2: {
          answeredAt: '2026-08-20T20:02:00.000Z',
          isCompatible: false,
          questionText: 'Who snores?',
        },
      },
    },
  },
};

describe('issue #1208 executive summary data', () => {
  it('snapshots the current compatibility question text', () => {
    expect(
      compatibilityQuestionText(
        { prompts: [{ language: 'PL', text: 'Czy się zgadzasz?' }, { language: 'EN', text: 'Do you agree?' }] },
        'EN',
      ),
    ).toBe('Do you agree?');
    expect(compatibilityQuestionText({ question: { PL: 'Pytanie', EN: 'Question' } }, 'PL')).toBe(
      'Pytanie',
    );
    expect(compatibilityQuestionText({ question: 'Legacy' }, 'EN')).toBe('Legacy');
    expect(compatibilityQuestionText(null, 'EN')).toBe('');
  });

  it('accepts and bounds questionText in live state', () => {
    const state = normalizeLiveState(
      {
        step_order: ['a'],
        completed_step_ids: [],
        actual_timestamps: {},
        game_results: {
          g: {
            questions: {
              q1: {
                answeredAt: '2026-08-20T20:01:00.000Z',
                isCompatible: true,
                questionText: `  ${'x'.repeat(600)}  `,
              },
            },
          },
        },
      },
      [{ id: 'a', time: '18:00' }],
    );
    expect(state.game_results.g.questions.q1.questionText).toHaveLength(500);
  });

  it('computes the compatibility percentage from answered questions', () => {
    expect(buildCompatibilitySummary({ questions: {} }).percentage).toBeNull();
    expect(
      buildCompatibilitySummary({
        totalQuestions: 4,
        questions: {
          q1: { answeredAt: '2026-08-20T20:01:00.000Z', isCompatible: true },
          q2: { answeredAt: '2026-08-20T20:02:00.000Z', isCompatible: false },
          q3: { answeredAt: '2026-08-20T20:03:00.000Z', isCompatible: true },
        },
      }),
    ).toMatchObject({
      percentage: 67,
      answered: 3,
      compatible: 2,
      incompatible: 1,
      totalQuestions: 4,
    });
  });

  it('extends the recap with questions, actual end, accepted requests and animations', () => {
    const recap = buildWeddingRecap({
      wedding,
      liveState,
      songRequests: [
        { song: 'A', artist: 'X', status: 'accepted', created_at: '2026-08-20T18:00:00.000Z' },
        { song: 'B', artist: 'Y', status: 'accepted', created_at: '2026-08-20T19:00:00.000Z' },
        { song: 'C', artist: 'Z', status: 'pending', created_at: '2026-08-20T20:00:00.000Z' },
      ],
      generatedAt: new Date('2026-08-25T10:00:00.000Z'),
    });
    expect(recap.summary).toMatchObject({
      actualEnd: '22:10',
      completedSteps: 1,
      animations: 1,
      acceptedSongRequests: 2,
    });
    expect(recap.music.guestRequests[0].status).toBe('accepted');
    expect(recap.games[0].questions).toEqual([
      {
        id: 'q1',
        text: 'Do you agree?',
        isCompatible: true,
        answeredAt: '2026-08-20T20:01:00.000Z',
      },
      {
        id: 'q2',
        text: 'Who snores?',
        isCompatible: false,
        answeredAt: '2026-08-20T20:02:00.000Z',
      },
    ]);
  });

  it('wires the compatibility snapshot and request status into the source', () => {
    expect(read('src/components/GameClickerOverlay.jsx')).toContain('questionText');
    expect(read('src/lib/liveStageState.js')).toContain('questionText');
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain("select('song, artist, status, created_at')");
  });
});
