import { readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FIXTURES_DIR,
  validateCartridgeFile,
  validateCartridge,
} from '../schema/validate-lib.mjs';

const fixtureFiles = readdirSync(FIXTURES_DIR)
  .filter((name) => name.endsWith('.json'))
  .sort();

const EXPECTED_INVALID_REASONS = {
  'invalid-legacy-buffer-field.json': 'must NOT have additional properties',
  'invalid-cake-serve-time.json': 'serveTime cannot be before the cake cutting time',
  'invalid-duplicate-step-id.json': 'duplicate step id',
  'invalid-fire-safety.json': 'fire effects require a permit requirement',
  'invalid-iso-timestamp.json': 'must match pattern',
  'invalid-missing-cultural-rule.json': 'bread_salt',
  'invalid-music-window.json': 'requestWindow.end must be after start',
  'invalid-oczepiny-anchor.json': 'MIDNIGHT Oczepiny requires an anchorId',
  'invalid-song-step-ref.json': 'unknown step id',
  'invalid-speech-order.json': 'duplicate speech order',
  'invalid-sync-pin.json': 'must match pattern',
  'invalid-unknown-step-ref.json': 'unknown step id',
  'invalid-unknown-top-level.json': 'must NOT have additional properties',
};

describe('schema fixture suite', () => {
  it('has valid, real-wedding and invalid fixtures', () => {
    expect(fixtureFiles.some((name) => name.startsWith('valid-'))).toBe(true);
    expect(fixtureFiles.some((name) => name.startsWith('real-'))).toBe(true);
    expect(fixtureFiles.some((name) => name.startsWith('invalid-'))).toBe(true);
  });

  it.each(fixtureFiles.filter((name) => name.startsWith('valid-')))(
    '%s passes structural and semantic validation',
    async (name) => {
      const { errors } = await validateCartridgeFile(path.join(FIXTURES_DIR, name));
      expect(errors).toEqual([]);
    },
  );

  it.each(fixtureFiles.filter((name) => name.startsWith('real-')))(
    '%s (real wedding) passes validation',
    async (name) => {
      const { errors } = await validateCartridgeFile(path.join(FIXTURES_DIR, name));
      expect(errors).toEqual([]);
    },
  );

  it.each(fixtureFiles.filter((name) => name.startsWith('invalid-')))(
    '%s is rejected for its intended rule',
    async (name) => {
      const { errors } = await validateCartridgeFile(path.join(FIXTURES_DIR, name));
      const expected = EXPECTED_INVALID_REASONS[name];
      expect(expected, `missing expected reason for ${name}`).toBeTruthy();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.message.includes(expected))).toBe(true);
    },
  );

  it('keeps the real Jennifer & Guillaume fixture stable', async () => {
    const { cartridge, errors } = await validateCartridgeFile(
      path.join(FIXTURES_DIR, 'real-jennifer-guillaume.json'),
    );
    expect(errors).toEqual([]);
    expect(cartridge.couple).toBe('Jennifer & Guillaume');
    expect(cartridge.steps).toHaveLength(9);
    expect(cartridge.hardAnchors).toHaveLength(3);
    expect(cartridge.liveSyncState.actual_timestamps.step_03).toBe(
      '2026-08-20T18:25:00+02:00',
    );
  });

  it('validates the canonical example cartridge', async () => {
    const { errors } = await validateCartridgeFile(
      path.join(FIXTURES_DIR, '..', 'wedding-cartridge.example.json'),
    );
    expect(errors).toEqual([]);
  });

  it('exposes the same validator shape used by the browser importer', async () => {
    const { cartridge } = await validateCartridgeFile(
      path.join(FIXTURES_DIR, 'valid-minimal.json'),
    );
    expect(await validateCartridge(cartridge)).toEqual([]);
  });
});
