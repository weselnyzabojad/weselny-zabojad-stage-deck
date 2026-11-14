import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sanitizeCartridge } from '../../src/lib/cartridgeImporter.js';
import { sanitizeCartridge as sanitizeServerCartridge } from '../../supabase/functions/_shared/cartridgeSemantics.js';
import { resolveCeremony } from '../../src/lib/ceremony.js';
import { resolveGameQuestionLists } from '../../src/lib/games.js';
import { filterEnabledSteps } from '../../src/lib/predefinedSteps.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #629 ceremony, games and wishes live on steps', () => {
  it('removes the three top-level blocks from the main schema', () => {
    const schema = json('schema/wedding-schema-v1.1.json');
    for (const key of ['ceremony', 'games', 'wishes']) {
      expect(schema.properties[key]).toBeUndefined();
    }
    const steps = json('schema/domains/steps.json');
    expect(steps.$defs.step.properties.ceremony).toBeTruthy();
    expect(steps.$defs.step.properties.game).toBeTruthy();
    expect(steps.$defs.step.properties.gameId).toBeUndefined();
    expect(steps.$defs.step.properties.ceremonyType).toBeUndefined();
  });

  it('keeps example, fixture and demo free of the top-level blocks', () => {
    for (const path of [
      'schema/wedding-cartridge.example.json',
      'schema/fixtures/real-jennifer-guillaume.json',
    ]) {
      const cartridge = json(path);
      for (const key of ['ceremony', 'games', 'wishes']) {
        expect(cartridge[key], `${path}:${key}`).toBeUndefined();
      }
      expect(cartridge.steps.some((step) => step.ceremony)).toBe(true);
      expect(cartridge.steps.some((step) => step.game)).toBe(true);
    }
    expect(read('src/demo/demoWedding.js')).not.toMatch(/^  (ceremony|games|wishes):/m);
  });

  it('reads ceremony and games from steps', () => {
    const cartridge = json('schema/wedding-cartridge.example.json');
    expect(resolveCeremony(cartridge).type).toBe('RELIGIOUS');
    expect(resolveGameQuestionLists(cartridge).map((game) => game.id)).toEqual([
      'test_wiedzy',
      'test_zgodnosci',
    ]);
    expect(filterEnabledSteps(cartridge).some((step) => step.game)).toBe(true);
  });

  it('migrates legacy top-level blocks on the client and server', async () => {
    const legacy = json('schema/wedding-cartridge.example.json');
    legacy.ceremony = legacy.steps.find((step) => step.ceremony).ceremony;
    legacy.games = {
      enabled: true,
      questionLists: legacy.steps
        .map((step) => step.game)
        .filter(Boolean)
        .map((game) => ({ ...game })),
    };
    legacy.wishes = { enabled: true };
    legacy.steps = legacy.steps.map((step) => {
      if (step.ceremony) delete step.ceremony;
      if (step.game) {
        const gameId = step.game.id;
        delete step.game;
        return { ...step, optionalFlag: 'games', gameId };
      }
      if (/wishes/i.test(step.title ?? '')) return { ...step, optionalFlag: 'wishes' };
      return step;
    });

    for (const clean of [sanitizeCartridge(legacy), sanitizeServerCartridge(legacy)]) {
      for (const key of ['ceremony', 'games', 'wishes']) {
        expect(clean[key]).toBeUndefined();
      }
      expect(clean.steps.some((step) => step.ceremony)).toBe(true);
      expect(clean.steps.filter((step) => step.game)).toHaveLength(2);
      expect(clean.steps.some((step) => step.optionalFlag === 'wishes')).toBe(false);
      expect(await validateCartridge(clean)).toEqual([]);
    }
  });

  it('maps Google Doc ceremony and game sections into steps', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    expect(result.cartridge).not.toHaveProperty('ceremony');
    expect(result.cartridge).not.toHaveProperty('games');
    expect(result.cartridge).not.toHaveProperty('wishes');
    expect(result.cartridge.steps.find((step) => step.ceremony)?.ceremony.type).toBe(
      'RELIGIOUS',
    );
    expect(result.cartridge.steps.filter((step) => step.game).length).toBeGreaterThan(0);
  });

  it('keeps the Edge schema and steps domain mirrored', () => {
    expect(read('supabase/functions/_shared/wedding-schema-v1.1.json')).toBe(
      read('schema/wedding-schema-v1.1.json'),
    );
    expect(read('supabase/functions/_shared/domains/steps.json')).toBe(
      read('schema/domains/steps.json'),
    );
  });
});
