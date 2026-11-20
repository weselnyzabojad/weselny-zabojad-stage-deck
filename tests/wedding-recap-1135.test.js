import { describe, expect, it } from 'vitest';
import { buildWeddingRecap } from '../src/lib/weddingRecap.js';

const wedding = {
  weddingId: 'W-UM-2026-08-001',
  date: '20.08.2026',
  timezone: 'UTC',
  coupleProfile: {
    bride: { firstName: 'Jennifer' },
    groom: { firstName: 'Guillaume' },
    commonLanguages: ['FR', 'PL', 'EN'],
  },
  venueDetails: { name: 'Garden Venue', phone: '+48 600 111 222' },
  mediaTeam: [
    {
      id: 'photo_main',
      role: 'PHOTO',
      name: 'Magda',
      phone: '+48 600 000 000',
      email: 'magda@example.com',
      startTime: '14:00',
      endTime: '21:30',
      notes: 'internal photo note',
    },
  ],
  musicians: {
    items: [
      {
        id: 'm1',
        name: 'Anna',
        instrument: 'violin',
        startTime: '15:00',
        endTime: '21:00',
        ceremonyRequired: true,
        notes: 'musician private note',
      },
    ],
  },
  musicPolicy: {
    discoPoloPolicy: 'NO',
    importantSongs: [
      { id: 'song_ceremony', stepId: 'ceremony', title: 'Canon in D', artist: 'Pachelbel' },
    ],
    mustPlay: [{ id: 'song_ceremony', track: 'Canon in D', note: 'internal must-play note' }],
    doNotPlay: [{ track: 'Macarena' }],
  },
  steps: [
    { id: 'arrival', time: '15:30', title: 'First guests', type: 'HARD_ANCHOR' },
    {
      id: 'ceremony',
      time: '17:00',
      title: 'Ceremony',
      type: 'FLEXIBLE',
      location: 'Garden',
      isMainSongRequired: true,
      notes: 'internal step note',
      mcCues: [{ text: 'internal MC cue' }],
      teleprompter: { items: [{ lines: [{ text: 'private speech script' }] }] },
      ceremony: {
        notes: 'internal ceremony note',
        subSteps: [
          {
            id: 'entrance',
            time: '17:00',
            title: 'Bridal entrance',
            notes: 'internal sub-step note',
            musicCue: 'Canon in D',
            responsibleRole: 'Musician',
          },
        ],
      },
    },
    { id: 'dinner', time: '18:30', title: 'Dinner', type: 'HARD_ANCHOR' },
    { id: 'cake', time: '20:30', title: 'Cake', type: 'HARD_ANCHOR', game: { id: 'quiz', title: 'Wedding quiz' } },
    { id: 'closure', time: '23:00', title: 'Closure', type: 'HARD_ANCHOR', mandatory: { kind: 'CLOSURE' } },
  ],
};

const liveState = {
  active_step_id: 'cake',
  completed_step_ids: ['arrival', 'ceremony'],
  actual_timestamps: {
    ceremony: '2026-08-20T17:10:00.000Z',
    dinner: '2026-08-20T18:45:00.000Z',
    cake: '2026-08-20T20:45:00.000Z',
  },
  game_results: {
    quiz: {
      startedAt: '2026-08-20T19:00:00.000Z',
      completedAt: '2026-08-20T19:10:00.000Z',
      totalQuestions: 5,
      answeredCount: 4,
      score: 3,
      questions: { q1: { answeredAt: '2026-08-20T19:01:00.000Z' } },
    },
  },
  mutation_log: [
    {
      id: 'm1',
      device_id: 'device-mc',
      role: 'mc',
      op: 'schedule_change',
      timestamp: '2026-08-20T16:50:00.000Z',
      payload: {
        change: {
          kind: 'reschedule',
          stepId: 'ceremony',
          stepTitle: 'Ceremony',
          from: '17:00',
          to: '17:15',
          authorRole: 'mc',
        },
      },
    },
    {
      id: 'm2',
      device_id: 'device-mc',
      role: 'mc',
      op: 'media_override',
      timestamp: '2026-08-20T16:51:00.000Z',
      payload: { key: 'steps', value: { kind: 'array', length: 5 } },
    },
    {
      id: 'm3',
      device_id: 'device-photo',
      role: 'photo1',
      op: 'schedule_change',
      timestamp: '2026-08-20T16:52:00.000Z',
      payload: { change: { kind: 'undo', stepId: 'ceremony' } },
    },
  ],
};

describe('issue #1135 wedding recap data contract', () => {
  const recap = buildWeddingRecap({
    wedding,
    liveState,
    generatedAt: new Date('2026-08-25T10:00:00.000Z'),
    songRequests: [
      { id: 's1', song: 'Perfect', artist: 'Ed Sheeran', created_at: '2026-08-20T18:00:00.000Z', device_id: 'guest-device' },
      { id: 's2', song: 'Dancing Queen', artist: 'ABBA', created_at: '2026-08-20T19:00:00.000Z' },
    ],
  });

  it('builds the wedding identity and summary', () => {
    expect(recap.schemaVersion).toBe(1);
    expect(recap.generatedAt).toBe('2026-08-25T10:00:00.000Z');
    expect(recap.wedding).toMatchObject({
      id: 'W-UM-2026-08-001',
      couple: 'Jennifer & Guillaume',
      date: '20.08.2026',
      dateISO: '2026-08-20',
      venue: 'Garden Venue',
    });
    expect(recap.summary).toMatchObject({
      totalSteps: 5,
      completedSteps: 2,
      firstActualStart: '17:10',
      lastActualStart: '20:45',
      scheduleChangeCount: 1,
      songRequestCount: 2,
      gameCount: 1,
      ceremonyPartCount: 1,
    });
    expect(recap.summary.biggestDelayMinutes).toBeGreaterThanOrEqual(10);
  });

  it('keeps the realized timeline and statuses', () => {
    expect(recap.timeline.map((entry) => entry.id)).toEqual([
      'arrival',
      'ceremony',
      'dinner',
      'cake',
      'closure',
    ]);
    expect(recap.timeline[1]).toMatchObject({
      id: 'ceremony',
      plannedStart: '17:00',
      actualStart: '17:10',
      status: 'done',
    });
    expect(recap.timeline[3].status).toBe('active');
  });

  it('humanizes only effective schedule changes', () => {
    expect(recap.changes).toEqual([
      {
        at: '2026-08-20T16:50:00.000Z',
        stepId: 'ceremony',
        stepTitle: 'Ceremony',
        from: '17:00',
        to: '17:15',
        authorRole: 'mc',
      },
    ]);
  });

  it('includes safe music, games, ceremony and vendor blocks', () => {
    expect(recap.music.mainSongs[0]).toMatchObject({
      stepTitle: 'Ceremony',
      title: 'Canon in D',
      artist: 'Pachelbel',
    });
    expect(recap.music.mustPlay).toEqual([{ track: 'Canon in D — Pachelbel' }]);
    expect(recap.music.doNotPlay).toEqual([{ track: 'Macarena' }]);
    expect(recap.music.guestRequests).toEqual([
      { song: 'Perfect', artist: 'Ed Sheeran', createdAt: '2026-08-20T18:00:00.000Z' },
      { song: 'Dancing Queen', artist: 'ABBA', createdAt: '2026-08-20T19:00:00.000Z' },
    ]);
    expect(recap.games[0]).toMatchObject({
      gameId: 'quiz',
      title: 'Wedding quiz',
      answeredCount: 4,
      score: 3,
    });
    expect(recap.ceremony).toEqual([
      {
        stepId: 'ceremony',
        stepTitle: 'Ceremony',
        id: 'entrance',
        time: '17:00',
        title: 'Bridal entrance',
        musicCue: 'Canon in D',
        responsibleRole: 'Musician',
      },
    ]);
    expect(recap.vendors.mediaTeam[0]).toEqual({
      role: 'PHOTO',
      name: 'Magda',
      startTime: '14:00',
      endTime: '21:30',
    });
    expect(recap.vendors.musicians[0]).toMatchObject({
      name: 'Anna',
      instrument: 'violin',
      ceremonyRequired: true,
    });
  });

  it('never leaks contacts, internal notes, tokens or raw logs', () => {
    const serialized = JSON.stringify(recap);
    for (const forbidden of [
      '+48 600 000 000',
      '+48 600 111 222',
      'magda@example.com',
      'device-mc',
      'guest-device',
      'device_id',
      'internal photo note',
      'internal step note',
      'internal MC cue',
      'private speech script',
      'internal ceremony note',
      'internal sub-step note',
      'internal must-play note',
      'musician private note',
      'mutation_log',
      'teleprompter',
      'mcCues',
    ]) {
      expect(serialized, forbidden).not.toContain(forbidden);
    }
  });

  it('survives missing live state and song requests', () => {
    const empty = buildWeddingRecap({
      wedding: { weddingId: 'W-UM-2026-08-001', steps: [] },
      generatedAt: new Date('2026-08-25T10:00:00.000Z'),
    });
    expect(empty.summary.totalSteps).toBe(0);
    expect(empty.timeline).toEqual([]);
    expect(empty.changes).toEqual([]);
    expect(empty.music.guestRequests).toEqual([]);
    expect(empty.games).toEqual([]);
    expect(empty.ceremony).toEqual([]);
  });
});
