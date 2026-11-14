import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sanitizeCartridge } from '../../src/lib/cartridgeImporter.js';
import { sanitizeCartridge as sanitizeServerCartridge } from '../../supabase/functions/_shared/cartridgeSemantics.js';
import { coupleDisplayName, resolveCoupleIdentity } from '../../src/lib/coupleIdentity.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';
import { normalizePublishRequest } from '../../supabase/functions/_shared/adminPublish.js';
import { validateCartridge } from '../../schema/validate-lib.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #621 coupleProfile is the only identity source', () => {
  it('requires coupleProfile and removes the top-level couple string', () => {
    const schema = json('schema/wedding-schema-v1.1.json');
    expect(schema.required).toContain('coupleProfile');
    expect(schema.required).not.toContain('couple');
    expect(schema.properties.couple).toBeUndefined();
    expect(schema.$defs.coupleProfile).toBeUndefined();
    expect(schema.$defs.couplePerson).toBeUndefined();
  });

  it('keeps the cartridge example and fixtures on coupleProfile only', () => {
    expect(json('schema/wedding-cartridge.example.json')).not.toHaveProperty('couple');
    expect(json('schema/fixtures/real-jennifer-guillaume.json')).not.toHaveProperty('couple');
  });

  it('resolves names from the profile without a legacy couple fallback', () => {
    const identity = resolveCoupleIdentity({
      couple: 'Legacy Name',
      coupleProfile: {
        bride: { firstName: 'Jennifer', nationalities: ['FR'] },
        groom: { firstName: 'Guillaume', nationalities: ['FR'] },
        commonLanguages: ['FR'],
      },
    });
    expect(identity.displayName).toBe('Jennifer & Guillaume');
    expect(identity.fallbackLabel).toBeUndefined();
    expect(coupleDisplayName({ couple: 'Legacy Name' })).toBe('Wedding');
  });

  it('migrates a legacy couple string on the client and server before validation', async () => {
    const legacy = {
      ...json('schema/wedding-cartridge.example.json'),
      couple: 'Legacy & Couple',
    };
    delete legacy.coupleProfile;
    expect(legacy.couple).toBe('Legacy & Couple');

    for (const clean of [sanitizeCartridge(legacy), sanitizeServerCartridge(legacy)]) {
      expect(clean).not.toHaveProperty('couple');
      expect(clean.coupleProfile.bride.firstName).toBe('Legacy');
      expect(clean.coupleProfile.groom.firstName).toBe('Couple');
      expect(await validateCartridge(clean)).toEqual([]);
    }
  });

  it('stops the Google Doc mapper from emitting a couple string', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    expect(result.cartridge).not.toHaveProperty('couple');
    expect(result.cartridge.coupleProfile.bride.firstName).toBe('Jennifer');
    expect(result.cartridge.coupleProfile.groom.firstName).toBe('Guillaume');
  });

  it('derives the admin listing couple name from the cartridge profile', () => {
    const normalized = normalizePublishRequest({
      weddingId: '2026-08-20_jennifer_guillaume',
      couple: 'Stale display name',
      cartridge: json('schema/wedding-cartridge.example.json'),
      roles: ['mc'],
    });
    expect(normalized.request.couple).toBe('Jennifer & Guillaume');
  });
});
