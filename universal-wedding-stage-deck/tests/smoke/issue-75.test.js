import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import weddingSchema from '../../schema/wedding-schema-v1.1.json';
import stepsSchema from '../../schema/domains/steps.json';
import { sanitizeCartridge, validateCartridge } from '../../src/lib/cartridgeImporter.js';

const minimal = JSON.parse(
  readFileSync(new URL('../../schema/fixtures/valid-minimal.json', import.meta.url), 'utf8'),
);

const clone = (value) => JSON.parse(JSON.stringify(value));

function legacyCartridge() {
  const cartridge = clone(minimal);
  cartridge.jokersCount = 2;
  cartridge.jokerGames = [
    { id: 'joker_1', category: 'GAME', title: 'Musical chairs', content: '...' },
  ];
  cartridge.weatherVariants = ['DEFAULT', 'RAIN'];
  cartridge.steps[0].deferable = true;
  cartridge.steps[0].weatherOption = 'RAIN';
  cartridge.steps[0].cateringNotes = 'No pork';
  cartridge.steps[0].propsAndFx = ['Sparklers'];
  cartridge.liveSyncState = {
    active_step_id: 'step_01',
    completed_step_ids: [],
    step_order: ['step_01', 'step_02'],
    deferred_step_ids: [],
    manual_offset_minutes: 15,
  };
  return cartridge;
}

describe('issue #75 deprecated-feature cleanup', () => {
  it('removes the retired fields from the schema', () => {
    expect(weddingSchema.properties.jokersCount).toBeUndefined();
    expect(weddingSchema.properties.jokerGames).toBeUndefined();
    expect(weddingSchema.properties.weatherVariants).toBeUndefined();
    expect(weddingSchema.$defs.jokerGame).toBeUndefined();
    expect(stepsSchema.$defs.step.properties.deferable).toBeUndefined();
    expect(stepsSchema.$defs.step.properties.weatherOption).toBeUndefined();
    expect(stepsSchema.$defs.step.properties.cateringNotes).toBeUndefined();
    expect(stepsSchema.$defs.step.properties.propsAndFx).toBeUndefined();
    expect(weddingSchema.$defs.liveSyncState.properties.manual_offset_minutes).toBeUndefined();
    expect(weddingSchema.$defs.liveSyncState.properties.deferred_step_ids).toBeUndefined();
  });

  it('drops legacy fields instead of migrating them', () => {
    const clean = sanitizeCartridge(legacyCartridge());
    expect(clean.jokersCount).toBeUndefined();
    expect(clean.jokerGames).toBeUndefined();
    expect(clean.weatherVariants).toBeUndefined();
    expect(clean.steps[0].deferable).toBeUndefined();
    expect(clean.steps[0].weatherOption).toBeUndefined();
    expect(clean.steps[0].cateringNotes).toBeUndefined();
    expect(clean.steps[0].propsAndFx).toBeUndefined();
    expect(clean.liveSyncState.deferred_step_ids).toBeUndefined();
    expect(clean.liveSyncState.manual_offset_minutes).toBeUndefined();
  });

  it('still accepts and validates a legacy v1.1 cartridge after stripping', async () => {
    const result = await validateCartridge(legacyCartridge());
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(result.cartridge.jokerGames).toBeUndefined();
    expect(result.cartridge.steps[0].propsAndFx).toBeUndefined();
  });
});
