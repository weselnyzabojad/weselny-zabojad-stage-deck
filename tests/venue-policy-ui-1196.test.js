import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  setStepTag,
  validateVenuePolicyDraft,
} from '../src/lib/venuePolicies.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1196 venue policy UI contract', () => {
  it('validates the limiter draft boundaries', () => {
    expect(validateVenuePolicyDraft({ decibelLimitEnabled: false })).toMatchObject({
      valid: true,
      error: null,
    });
    expect(
      validateVenuePolicyDraft({ decibelLimitEnabled: true, decibelLimit: 50 }),
    ).toMatchObject({ valid: true, error: null });
    expect(
      validateVenuePolicyDraft({ decibelLimitEnabled: true, decibelLimit: 120 }),
    ).toMatchObject({ valid: true, error: null });
    expect(
      validateVenuePolicyDraft({ decibelLimitEnabled: true, decibelLimit: null }),
    ).toMatchObject({ valid: false, error: 'missing-limit' });
    expect(
      validateVenuePolicyDraft({ decibelLimitEnabled: true, decibelLimit: 121 }),
    ).toMatchObject({ valid: false, error: 'out-of-range' });
  });

  it('toggles a step tag and preserves unrelated step data', () => {
    const steps = [
      { id: 'a', title: 'Arrival', mandatory: { kind: 'MILESTONE' }, tags: ['SMOKE'] },
      { id: 'b', title: 'Dinner', tags: [] },
    ];
    const added = setStepTag(steps, 'a', 'HIGH_INTENSITY', true);
    expect(added[0].tags).toEqual(['SMOKE', 'HIGH_INTENSITY']);
    expect(added[0].mandatory).toEqual({ kind: 'MILESTONE' });
    expect(added[1]).toBe(steps[1]);

    const removed = setStepTag(added, 'a', 'SMOKE', false);
    expect(removed[0].tags).toEqual(['HIGH_INTENSITY']);
  });

  it('wires the policy editor into the venue view and the stage shell', () => {
    const view = read('src/components/VenueManagerView.jsx');
    expect(view).toContain('venuePolicies');
    expect(view).toContain('onUpdateVenuePolicies');
    expect(view).toContain('setStepTag');
    expect(view).toContain("venueManager.policies.stepTags");
    expect(view).toContain('FORBIDDEN_FX');
    expect(view).toContain('STEP_TAGS');

    const stage = read('src/StageDeck.jsx');
    expect(stage).toContain("setMediaOverride('venuePolicies'");
    expect(stage).toContain('venuePolicies={liveState.media_overrides?.venuePolicies');
  });

  it('ships the policy copy in PL, EN and FR', () => {
    for (const locale of ['pl', 'en', 'fr']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of [
        'venueManager.policies.title',
        'venueManager.policies.limiterEnabled',
        'venueManager.policies.decibelLimit',
        'venueManager.policies.forbiddenFx',
        'venueManager.policies.save',
        'venueManager.policies.stepTags',
        'venueManager.policies.tag.HIGH_INTENSITY',
      ]) {
        expect(dict).toContain(`'${key}'`);
      }
    }
  });
});
