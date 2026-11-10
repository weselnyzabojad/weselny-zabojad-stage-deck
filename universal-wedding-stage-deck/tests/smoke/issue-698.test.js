import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LIVE_SYNC_CONFIG,
  PRIVACY_CONFIG,
  normalizeLiveSyncState,
  normalizePrivacy,
} from '../../src/config/index.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #698 runtime config folder', () => {
  it('keeps privacy and live-sync defaults in dedicated config modules', () => {
    expect(PRIVACY_CONFIG.cloudSync).toBe('ENCRYPTED_HOST_KEY');
    expect(PRIVACY_CONFIG.encryption.keyHolder).toBe('HOST');
    expect(LIVE_SYNC_CONFIG.active_step_id).toBeNull();
    expect(LIVE_SYNC_CONFIG.completed_step_ids).toEqual([]);
    expect(normalizePrivacy({})).toEqual({
      cloudSync: 'ENCRYPTED_HOST_KEY',
      encryption: { alg: 'AES-GCM', keyHolder: 'HOST', version: 1 },
    });
    expect(normalizeLiveSyncState({}).active_speech_id).toBeNull();
  });

  it('uses the config defaults when the Doc omits privacy/live-sync values', async () => {
    const { cartridge } = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );

    expect(cartridge.privacy).toEqual({
      cloudSync: 'ENCRYPTED_HOST_KEY',
      encryption: { alg: 'AES-GCM', keyHolder: 'HOST', version: 1 },
    });
    expect(cartridge.liveSyncState).toMatchObject({
      active_step_id: 'step_03',
      checked_subtasks: {},
      mutation_log: [],
    });
    expect(await validateCartridge(cartridge)).toEqual([]);
  });
});
