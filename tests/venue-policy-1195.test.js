import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  normalizeStepTags,
  normalizeVenuePolicies,
  venuePolicyWarnings,
} from '../src/lib/venuePolicies.js';
import { normalizeLiveState } from '../src/lib/liveStageState.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1195 venue policy contract', () => {
  it('adds the four optional step tags to both schema copies', () => {
    for (const path of ['schema/domains/steps.json', 'supabase/functions/_shared/domains/steps.json']) {
      const schema = JSON.parse(read(path));
      expect(schema.$defs.step.properties.tags).toMatchObject({
        type: 'array',
        uniqueItems: true,
        default: [],
        items: {
          type: 'string',
          enum: ['HIGH_INTENSITY', 'SMOKE', 'HAZE', 'SPARKS'],
        },
      });
    }
  });

  it('normalizes tags and rejects unknown or duplicate entries', () => {
    expect(normalizeStepTags(['SMOKE', 'SMOKE', 'HAZE', 'OTHER'])).toEqual([
      'SMOKE',
      'HAZE',
    ]);
    expect(normalizeStepTags(null)).toEqual([]);
  });

  it('normalizes the venue policy override', () => {
    expect(
      normalizeVenuePolicies({
        decibelLimitEnabled: true,
        decibelLimit: 95.4,
        forbiddenFx: ['smoke', 'fire', 'smoke', 'sparks'],
      }),
    ).toEqual({
      decibelLimitEnabled: true,
      decibelLimit: 95,
      forbiddenFx: ['smoke', 'sparks'],
    });

    expect(normalizeVenuePolicies({ decibelLimitEnabled: true })).toEqual({
      decibelLimitEnabled: false,
      decibelLimit: null,
      forbiddenFx: [],
    });
    expect(normalizeVenuePolicies(null)).toEqual({
      decibelLimitEnabled: false,
      decibelLimit: null,
      forbiddenFx: [],
    });
  });

  it('returns a redline and one DMX lock per forbidden effect', () => {
    const result = venuePolicyWarnings(
      ['HIGH_INTENSITY', 'SMOKE', 'SPARKS'],
      {
        decibelLimitEnabled: true,
        decibelLimit: 96,
        forbiddenFx: ['smoke', 'sparks'],
      },
    );
    expect(result.warnings).toEqual([
      { type: 'redline', decibelLimit: 96, advice: { masterDb: -3 } },
      { type: 'dmx-lock', effect: 'smoke' },
      { type: 'dmx-lock', effect: 'sparks' },
    ]);
  });

  it('is empty-safe and never warns for unrelated tags', () => {
    expect(venuePolicyWarnings([], null).warnings).toEqual([]);
    expect(
      venuePolicyWarnings(['SMOKE'], {
        decibelLimitEnabled: true,
        decibelLimit: 95,
        forbiddenFx: ['haze'],
      }).warnings,
    ).toEqual([]);
    expect(
      venuePolicyWarnings(['HIGH_INTENSITY'], {
        decibelLimitEnabled: true,
        decibelLimit: 95,
        forbiddenFx: [],
      }).warnings,
    ).toHaveLength(1);
  });

  it('normalizes venue policies when live state loads', () => {
    const state = normalizeLiveState(
      {
        step_order: ['a'],
        completed_step_ids: [],
        actual_timestamps: {},
        media_overrides: {
          venuePolicies: {
            decibelLimitEnabled: true,
            decibelLimit: 'loud',
            forbiddenFx: ['smoke', 'smoke'],
          },
        },
      },
      [{ id: 'a', time: '18:00', title: 'Arrival' }],
    );
    expect(state.media_overrides.venuePolicies).toEqual({
      decibelLimitEnabled: false,
      decibelLimit: null,
      forbiddenFx: ['smoke'],
    });
  });
});
