import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { collectSemanticErrors } from '../src/lib/cartridgeValidation.js';
import { validateCartridge } from '../schema/validate-lib.mjs';

const minimal = JSON.parse(
  readFileSync(new URL('../schema/fixtures/valid-minimal.json', import.meta.url), 'utf8'),
);

const clone = (value) => JSON.parse(JSON.stringify(value));
const errorsFor = (mutator) => {
  const cartridge = clone(minimal);
  mutator(cartridge);
  return collectSemanticErrors(cartridge);
};
const messages = (errors) => errors.map((error) => `${error.location} ${error.message}`).join('\n');

describe('semantic validation rules', () => {
  it('accepts the minimal valid cartridge', async () => {
    expect(collectSemanticErrors(clone(minimal))).toEqual([]);
    expect(await validateCartridge(clone(minimal))).toEqual([]);
  });

  it('rejects duplicate step IDs', () => {
    const errors = errorsFor((cartridge) => {
      cartridge.steps.push({ ...cartridge.steps[0], title: 'Duplicate' });
    });
    expect(messages(errors)).toContain('duplicate step id "step_01"');
  });

  it('rejects live-state references to unknown steps', () => {
    const errors = errorsFor((cartridge) => {
      cartridge.liveSyncState = {
        active_step_id: 'step_02',
        completed_step_ids: ['step_99'],
        step_order: ['step_01', 'step_02'],
      };
    });
    expect(messages(errors)).toContain('unknown step id "step_99"');
  });

  it('rejects an active step that is also completed', () => {
    const errors = errorsFor((cartridge) => {
      cartridge.liveSyncState = {
        active_step_id: 'step_01',
        completed_step_ids: ['step_01'],
        step_order: ['step_01', 'step_02'],
      };
    });
    expect(messages(errors)).toContain('active step cannot also be completed');
  });

  it('rejects a step that is both deferred and completed', () => {
    const errors = errorsFor((cartridge) => {
      cartridge.liveSyncState = {
        active_step_id: 'step_02',
        completed_step_ids: ['step_01'],
        deferred_step_ids: ['step_01'],
        step_order: ['step_01', 'step_02'],
      };
    });
    expect(messages(errors)).toContain('deferred step cannot be completed');
  });

  it('rejects an inverted buffer range and out-of-range duration', () => {
    const errors = errorsFor((cartridge) => {
      cartridge.steps[0].durationMin = 70;
      cartridge.steps[0].buffer = { minDurationMin: 60, maxDurationMin: 30 };
    });
    expect(messages(errors)).toContain('minDurationMin cannot exceed maxDurationMin');
    expect(messages(errors)).toContain('durationMin is above buffer.maxDurationMin');
  });

  it('rejects cake serving before the cutting time', () => {
    const errors = errorsFor((cartridge) => {
      cartridge.cake = { time: '21:30', serveTime: '21:00' };
    });
    expect(messages(errors)).toContain('serveTime cannot be before the cake cutting time');
  });

  it('rejects a reversed guest-request window', () => {
    const errors = errorsFor((cartridge) => {
      cartridge.musicPolicy = { requestWindow: { start: '23:00', end: '20:00' } };
    });
    expect(messages(errors)).toContain('requestWindow.end must be after start');
  });

  it('rejects MIDNIGHT Oczepiny without an anchor', () => {
    const errors = errorsFor((cartridge) => {
      cartridge.oczepiny = { enabled: true, order: 'MIDNIGHT' };
    });
    expect(messages(errors)).toContain('MIDNIGHT Oczepiny requires an anchorId');
  });

  it('rejects fire effects without permit, approval or briefing', () => {
    const errors = errorsFor((cartridge) => {
      cartridge.photoPlan = { specialEffects: { fire: true } };
    });
    expect(messages(errors)).toContain('fire effects require a permit requirement');
    expect(messages(errors)).toContain('fire effects require venue approval');
    expect(messages(errors)).toContain('fire effects require a safety briefing');
  });

  it('requires sunset coordinates for a mini session', () => {
    const errors = errorsFor((cartridge) => {
      cartridge.photoPlan = { miniSession: { enabled: true } };
    });
    expect(messages(errors)).toContain('mini session requires sunset latitude and longitude');
  });

  it('rejects duplicate speech order values', () => {
    const errors = errorsFor((cartridge) => {
      cartridge.speeches = [
        { id: 'speech_a', order: 1, speaker: { name: 'A' } },
        { id: 'speech_b', order: 1, speaker: { name: 'B' } },
      ];
    });
    expect(messages(errors)).toContain('duplicate speech order 1');
  });

  it('rejects key songs that point at an unknown step', () => {
    const errors = errorsFor((cartridge) => {
      cartridge.musicPolicy = {
        importantSongs: [
          {
            id: 'first_dance',
            moment: 'FIRST_DANCE',
            title: 'Perfect',
            artist: 'Ed Sheeran',
            stepId: 'step_99',
            source: { type: 'SPOTIFY', url: 'https://open.spotify.com/track/demo' },
          },
        ],
      };
    });
    expect(messages(errors)).toContain('unknown step id "step_99"');
  });

  it('rejects broken customer-file song sources', () => {
    const errors = errorsFor((cartridge) => {
      cartridge.musicPolicy = {
        importantSongs: [
          {
            id: 'first_dance',
            moment: 'FIRST_DANCE',
            title: 'Perfect',
            artist: 'Ed Sheeran',
            stepId: 'step_01',
            source: { type: 'CUSTOMER_FILE', fileRef: '' },
          },
        ],
      };
    });
    expect(messages(errors)).toContain('CUSTOMER_FILE requires a fileRef');
  });

  it('checks joker and VIP counts against their lists', () => {
    const errors = errorsFor((cartridge) => {
      cartridge.jokersCount = 2;
      cartridge.jokerGames = [{ id: 'one', category: 'GAME', title: 'One', content: 'x' }];
      cartridge.vipRadarCount = 2;
      cartridge.tact_and_vip_alerts = [];
    });
    expect(messages(errors)).toContain('jokersCount 2 does not match jokerGames.length 1');
    expect(messages(errors)).toContain('vipRadarCount 2 does not match tact_and_vip_alerts.length 0');
  });

  it('accepts both ISO and legacy actual timestamps structurally', async () => {
    const iso = clone(minimal);
    iso.liveSyncState = {
      active_step_id: 'step_02',
      completed_step_ids: ['step_01'],
      actual_timestamps: { step_01: '2026-08-20T14:31:00.000Z' },
      step_order: ['step_01', 'step_02'],
    };
    expect(await validateCartridge(iso)).toEqual([]);

    const legacy = clone(iso);
    legacy.liveSyncState.actual_timestamps = { step_01: '16:31' };
    expect(await validateCartridge(legacy)).toEqual([]);
  });
});
