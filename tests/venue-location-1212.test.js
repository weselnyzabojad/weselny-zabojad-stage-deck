import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  normalizeCountry,
  resolveVenueCountry,
} from '../supabase/functions/_shared/venueLocation.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1212 wedding venue location data', () => {
  it('adds nullable venue columns and validates the country format', () => {
    const sql = read('supabase/migrations/202611180001_wedding_venue_location.sql');
    for (const column of ['venue_name', 'venue_address', 'venue_city', 'venue_country']) {
      expect(sql).toContain(`add column if not exists ${column} text`);
    }
    expect(sql).toContain("venue_country ~ '^[A-Z]{2}$'");
    expect(sql).toContain("cartridge -> 'venueDetails' ->> 'venue'");
    expect(sql).toContain("cartridge -> 'venueDetails' ->> 'address'");
    expect(sql).toContain('coalesce(');
  });

  it('normalises explicit ISO country codes and rejects junk', () => {
    expect(normalizeCountry('pl')).toBe('PL');
    expect(normalizeCountry(' fr ')).toBe('FR');
    expect(normalizeCountry('BE')).toBe('BE');
    expect(normalizeCountry('ZZ')).toBeNull();
    expect(normalizeCountry('XX')).toBeNull();
    expect(normalizeCountry('FRA')).toBeNull();
    expect(normalizeCountry('')).toBeNull();
    expect(normalizeCountry(null)).toBeNull();
  });

  it('lets an explicit country win over the lookup', () => {
    expect(resolveVenueCountry({ country: 'DE', city: 'Paris' })).toBe('DE');
    expect(resolveVenueCountry({ country: 'de', city: 'Warszawa' })).toBe('DE');
    expect(resolveVenueCountry({ country: 'nope', city: 'Paris' })).toBe('FR');
  });

  it('resolves PL/FR/BE cities deterministically', () => {
    expect(resolveVenueCountry({ city: 'Warszawa' })).toBe('PL');
    expect(resolveVenueCountry({ city: 'Kraków' })).toBe('PL');
    expect(resolveVenueCountry({ city: 'Paris' })).toBe('FR');
    expect(resolveVenueCountry({ city: 'Bordeaux' })).toBe('FR');
    expect(resolveVenueCountry({ city: 'Bruxelles' })).toBe('BE');
    expect(resolveVenueCountry({ city: 'Antwerpen' })).toBe('BE');
    expect(resolveVenueCountry({ city: 'Nowhere' })).toBeNull();
    expect(resolveVenueCountry({})).toBeNull();
  });

  it('falls back to a deterministic postal-code pattern', () => {
    expect(resolveVenueCountry({ address: 'ul. Kwiatowa 1, 00-001' })).toBe('PL');
    expect(resolveVenueCountry({ address: '12 rue de Rivoli, 75001 Paris' })).toBe('FR');
    expect(resolveVenueCountry({ address: 'Rue Neuve 1, 1000 Bruxelles' })).toBe('BE');
    expect(resolveVenueCountry({ address: '12 rue sans code' })).toBeNull();
  });

  it('exposes the four fields from list and preserves the legacy venue field', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain(
      'venue_name, venue_address, venue_city, venue_country',
    );
    expect(api).toContain('venue: legacyVenue');
    expect(api).toContain('venue_name: row.venue_name ?? (legacyVenue || null)');
    expect(api).toContain('venue_address: row.venue_address ?? (legacyAddress || null)');
    expect(api).toContain('venue_city: row.venue_city ?? null');
    expect(api).toContain('venue_country: row.venue_country ?? null');
  });

  it('validates, audits and blocks the venue update for archived weddings', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain("action === 'update_wedding_venue'");
    expect(api).toContain("'update_wedding_venue',");
    expect(api).toContain('Venue country must be a valid two-letter ISO 3166-1 code.');
    expect(api).toContain('resolveVenueCountry({');
    expect(api).toContain("writeAudit(admin, allowlisted, 'update_wedding_venue'");
    expect(api).toContain('venue_name: venueName');
    expect(api).toContain('venue_address: venueAddress');
    expect(api).toContain('venue_city: venueCity');
    expect(api).toContain('venue_country: venueCountry');
  });

  it('does not add address or city fields to a public payload', () => {
    for (const path of [
      'supabase/functions/join_room/index.ts',
      'supabase/functions/recap/index.ts',
      'supabase/functions/submit_song_request/index.ts',
    ]) {
      const source = read(path);
      expect(source).not.toContain('venue_address');
      expect(source).not.toContain('venue_city');
    }
  });
});
