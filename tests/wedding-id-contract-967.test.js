import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateWeddingId } from '../src/admin/adminUtils.js';
import { googleDocTemplateToCartridge } from './helpers/googleDocCartridge.js';
import { parseGoogleDocTemplate } from '../src/lib/googleDocTemplate.js';
import { resolveEventDateISO } from '../src/lib/eventTime.js';
import {
  normalizePublishRequest,
  resolveExpiresAt,
  WEDDING_ID_PATTERN,
} from '../supabase/functions/_shared/adminPublish.js';
import { validateCartridge } from '../schema/validate-lib.mjs';

const VALID_ID = 'Weronika&Guillaume-UM-2027-04-002';
const template = readFileSync(
  new URL('../schema/google-doc-template.md', import.meta.url),
  'utf8',
);
const parseWithId = (weddingId) =>
  googleDocTemplateToCartridge(parseGoogleDocTemplate(template), {
    weddingId,
  });

describe('issue #967 UM wedding ID contract', () => {
  it('accepts the UM format in admin validation and rejects legacy values', () => {
    expect(validateWeddingId(VALID_ID)).toBe(true);
    expect(validateWeddingId('Anna&Tomek-UM-2026-09-001')).toBe(true);
    expect(WEDDING_ID_PATTERN.test(VALID_ID)).toBe(true);
    expect(validateWeddingId('2025-01-01_legacy_wedding')).toBe(false);
    expect(validateWeddingId('Weronika&Guillaume-um-2027-04-002')).toBe(false);
    expect(validateWeddingId('Weronika&Guillaume-UM-2027-4-002')).toBe(false);
    expect(validateWeddingId('Weronika Guillaume-UM-2027-04-002')).toBe(false);
    expect(validateWeddingId('')).toBe(false);
  });

  it('parses a Doc wedding ID and rejects every malformed shape', () => {
    const valid = parseWithId(VALID_ID);
    expect(valid.cartridge.weddingId).toBe(VALID_ID);
    expect(valid.errors.filter((error) => error.includes('Wedding ID'))).toEqual([]);

    for (const invalid of [
      '',
      '2025-01-01_legacy_wedding',
      'Weronika&Guillaume-um-2027-04-002',
      'Weronika&Guillaume-UM-2027-4-002',
      'Weronika&Guillaume-UM-2027-04-02',
      'Weronika Guillaume-UM-2027-04-002',
    ]) {
      const result = parseWithId(invalid);
      expect(
        result.errors.some((error) => error.startsWith('EVENT: Wedding ID')),
        invalid,
      ).toBe(true);
    }
  });

  it('rejects the legacy id at schema validation and publication', async () => {
    const legacy = {
      schemaVersion: '1.1',
      weddingId: '2025-01-01_legacy_wedding',
      coupleProfile: {
        bride: { firstName: 'Jennifer', nationalities: ['FR'] },
        groom: { firstName: 'Guillaume', nationalities: ['FR'] },
        commonLanguages: ['FR'],
      },
      date: '20.08.2026',
      syncPin: '2008',
      servicePackage: 'HOST_ONLY',
      culturalRules: {
        sto_lat: { status: 'YES' },
        gorzko: { status: 'STRICT_NO' },
        bread_salt: { status: 'TBC' },
      },
      steps: [
        { id: 'step_01', time: '16:00', title: 'Arrival', type: 'FLEXIBLE', location: 'Garden' },
      ],
      extensions: { languages: { hostLanguages: ['FR'] } },
    };
    const errors = await validateCartridge(legacy);
    expect(errors.some((error) => error.message.includes('must match pattern'))).toBe(true);

    const draft = (weddingId) => ({
      weddingId,
      date: '20.08.2026',
      cartridge: { ...legacy, weddingId },
      roles: ['mc'],
      expectedRevision: 0,
    });
    expect(normalizePublishRequest(draft(VALID_ID)).request.weddingId).toBe(VALID_ID);
    expect(normalizePublishRequest(draft(legacy.weddingId)).status).toBe(400);
    expect(normalizePublishRequest(draft(legacy.weddingId)).error).toMatch(
      /Name&Name-UM-YYYY-MM-NNN/,
    );
  });

  it('keeps TTL and event-date logic on date/dateISO, never the id', () => {
    const cartridge = { weddingId: VALID_ID, dateISO: '2027-04-15' };
    expect(resolveExpiresAt({ expiresInDays: 10 }, cartridge, null)).toBe(
      new Date(Date.parse('2027-04-15T23:59:59Z') + 10 * 86400000).toISOString(),
    );
    expect(resolveExpiresAt({}, { weddingId: VALID_ID }, null)).toBeNull();
    expect(resolveEventDateISO({ weddingId: VALID_ID, date: '15.04.2027' })).toBe(
      '2027-04-15',
    );
    expect(resolveEventDateISO({ weddingId: VALID_ID })).toBeNull();
    expect(resolveEventDateISO({ dateISO: '2027-04-15' })).toBe('2027-04-15');
  });
});
