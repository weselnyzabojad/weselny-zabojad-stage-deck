import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from './helpers/googleDocCartridge.js';
import { DEFAULT_WEDDING } from '../src/demo/demoWedding.js';
import { validateCartridge } from '../schema/validate-lib.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));
const template = read('schema/google-doc-template.md');
const parse = (source = template) => googleDocTemplateToCartridge(parseGoogleDocTemplate(source));

function withRequests(values) {
  return template
    .split('\n')
    .map((line) => {
      if (!line.startsWith('| Test ')) return line;
      const gameType = line.startsWith('| Test Wiedzy') ? 'TEST_WIEDZY' : 'TEST_ZGODNOSCI';
      if (!(gameType in values)) return line;
      const cells = line.split('|');
      cells[2] = ` ${values[gameType]} `;
      return cells.join('|');
    })
    .join('\n');
}

function gameFor(cartridge, gameType) {
  return cartridge.steps.find((step) => step.game?.gameType === gameType)?.game;
}

describe('issue #972 per-game Requested contract', () => {
  it('maps each Doc row to its own predefined game step', () => {
    const { cartridge, warnings } = parse(withRequests({ TEST_WIEDZY: 'YES', TEST_ZGODNOSCI: 'UNDECIDED' }));

    expect(warnings.filter((warning) => warning.startsWith('GAMES:'))).toEqual([]);
    expect(gameFor(cartridge, 'TEST_WIEDZY')).toMatchObject({
      id: 'test_wiedzy',
      requested: 'YES',
      enabled: true,
      sourceDocId: 'gdoc_test_wiedzy',
    });
    expect(gameFor(cartridge, 'TEST_ZGODNOSCI')).toMatchObject({
      id: 'test_zgodno_ci',
      requested: 'UNDECIDED',
      enabled: true,
      sourceDocId: 'gdoc_test_zgodnosci',
    });
    expect(cartridge.games).toBeUndefined();
  });

  it('normalizes case and keeps NO independent from enabled', () => {
    const { cartridge } = parse(withRequests({ TEST_WIEDZY: 'yes', TEST_ZGODNOSCI: 'no' }));
    const wiedzy = gameFor(cartridge, 'TEST_WIEDZY');
    const zgodnosci = gameFor(cartridge, 'TEST_ZGODNOSCI');

    expect(wiedzy.requested).toBe('YES');
    expect(wiedzy.enabled).toBe(true);
    expect(zgodnosci.requested).toBe('NO');
    expect(zgodnosci.enabled).toBe(false);
    expect(cartridge.steps.filter((step) => step.game)).toHaveLength(3);
  });

  it('warns and omits requested for missing or invalid values', () => {
    for (const [value, message] of [
      ['', 'missing Requested'],
      ['MAYBE', 'invalid Requested "MAYBE"'],
    ]) {
      const { cartridge, warnings } = parse(
        withRequests({ TEST_WIEDZY: value, TEST_ZGODNOSCI: 'UNDECIDED' }),
      );
      const wiedzy = gameFor(cartridge, 'TEST_WIEDZY');

      expect(wiedzy.requested).toBeUndefined();
      expect(wiedzy.enabled).toBe(true);
      expect(gameFor(cartridge, 'TEST_ZGODNOSCI').requested).toBe('UNDECIDED');
      expect(warnings.some((warning) => warning.includes(`GAMES: Test Wiedzy: ${message}`))).toBe(
        true,
      );
    }
  });

  it('keeps the demo cartridge and examples on the per-game contract', () => {
    for (const [path, cartridge] of [
      ['schema/wedding-cartridge.example.json', json('schema/wedding-cartridge.example.json')],
      ['schema/domains/steps.example.json', json('schema/domains/steps.example.json')],
      [
        'schema/fixtures/real-jennifer-guillaume.json',
        json('schema/fixtures/real-jennifer-guillaume.json'),
      ],
      ['src/demo/demoWedding.js', DEFAULT_WEDDING],
    ]) {
      const games = cartridge.steps.filter((step) => step.game).map((step) => step.game);
      expect(games.length, path).toBeGreaterThan(0);
      for (const game of games) {
        expect(['YES', 'NO', 'UNDECIDED'], `${path} ${game.id}`).toContain(game.requested);
      }
      expect(gameFor(cartridge, 'TEST_WIEDZY').requested, path).toBe('YES');
      expect(gameFor(cartridge, 'TEST_ZGODNOSCI').requested, path).toBe('UNDECIDED');
    }
  });

  it('keeps the schema and Edge copy byte-identical with optional requested', () => {
    expect(read('schema/domains/steps.json')).toBe(
      read('supabase/functions/_shared/domains/steps.json'),
    );
    const game = json('schema/domains/steps.json').$defs.game;
    expect(game.required).not.toContain('requested');
    expect(game.properties.requested.enum).toEqual(['YES', 'NO', 'UNDECIDED']);

    const map = json('schema/google-doc-field-map.json');
    expect(map.files['steps.example.json']['steps[].game.requested']).toBe('required');
    expect(map.files['wedding-cartridge.example.json']['steps[].game.requested']).toBe('required');
  });

  it('keeps cartridges without requested readable and publishable', async () => {
    const cartridge = json('schema/wedding-cartridge.example.json');
    for (const step of cartridge.steps) {
      if (step.game) delete step.game.requested;
    }
    expect(await validateCartridge(cartridge)).toEqual([]);
  });
});
