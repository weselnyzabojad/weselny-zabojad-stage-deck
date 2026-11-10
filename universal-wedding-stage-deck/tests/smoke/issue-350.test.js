import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { resolveMandatoryConstraints } from '../../src/lib/mandatorySteps.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const template = readFileSync(new URL('../../schema/google-doc-template.md', import.meta.url), 'utf8');
const parsed = parseGoogleDocTemplate(template);

describe('issue #350 Google Doc to cartridge mapping', () => {
  const result = googleDocTemplateToCartridge(parsed);

  it('maps event, couple and languages', () => {
    expect(result.cartridge.weddingId).toBe('2026-08-20_jennifer_guillaume');
    expect(result.cartridge.couple).toBeUndefined();
    expect(result.cartridge.coupleProfile.bride.firstName).toBe('Jennifer');
    expect(result.cartridge.extensions.languages.supported).toEqual(['PL', 'FR', 'EN']);
    expect(result.cartridge.ceremony.type).toBe('RELIGIOUS');
  });

  it('maps the timeline and derived durations', () => {
    expect(result.cartridge.steps.map((step) => step.id)).toEqual(
      expect.arrayContaining([
        'step_01',
        'step_02',
        'step_03',
        'step_05',
        'step_06',
        'step_07',
        'step_08',
        'step_09',
        'step_10',
        'step_11',
        'step_12',
      ]),
    );
    expect(result.cartridge.steps.find((step) => step.id === 'step_01').durationMin).toBe(30);
    const entrance = result.cartridge.steps.find((step) => step.id === 'step_03');
    expect(entrance.grandEntranceOrder).toBe('NEWLYWEDS_FIRST');
    const firstDance = result.cartridge.steps.find((step) => step.id === 'step_08');
    expect(firstDance.firstDanceMode).toBe('NORMAL');
    expect(firstDance.firstDanceStartAt).toBe('00:12');
    expect(firstDance.firstDanceStopAt).toBe('04:30');
  });

  it('maps mandatory constraints, kitchen and music content', () => {
    expect(result.cartridge).not.toHaveProperty('mandatorySteps');
    const constraints = resolveMandatoryConstraints(result.cartridge);
    expect(constraints.firstGuestsArrival).toBe('15:30');
    expect(constraints.kitchenServices.map(({ key, time }) => ({ key, time }))).toEqual([
      { key: 'dinner', time: '18:30' },
      { key: 'supper_1', time: '21:30' },
      { key: 'supper_2', time: '23:30' },
    ]);
    expect(result.cartridge.extensions.kitchen.courses).toHaveLength(2);
    expect(result.cartridge.musicPolicy.importantSongs.length).toBe(3);
    expect(result.cartridge.musicPolicy.mustPlay.length).toBe(2);
    expect(result.cartridge.musicPolicy.doNotPlay.length).toBe(1);
  });

  it('maps speeches, media, photo and todos', () => {
    expect(result.cartridge.speeches[0].id).toBe('speech_witness');
    expect(result.cartridge.speeches[0].script.text).toContain('Drodzy');
    expect(result.cartridge.mediaTeam).toHaveLength(2);
    expect(result.cartridge.photoPlan.groupPhotos.groups.map((group) => group.id)).toEqual([
      'bride_family',
      'groom_family',
      'friends',
    ]);
    expect(result.cartridge.photoPlan.groupPhotos).not.toHaveProperty('minGroupSize');
    expect(result.cartridge.photoPlan.groupPhotos).not.toHaveProperty('durationMin');
    expect(result.cartridge).not.toHaveProperty('preWeddingTodos');
    expect(result.cartridge).not.toHaveProperty('contacts');
    expect(result.cartridge).not.toHaveProperty('tact_and_vip_alerts');
  });

  it('produces a cartridge that passes schema and semantic validation', async () => {
    expect(result.errors).toEqual([]);
    const errors = await validateCartridge(result.cartridge);
    expect(errors).toEqual([]);
  });
});
