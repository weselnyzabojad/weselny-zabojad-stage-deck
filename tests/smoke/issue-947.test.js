import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as photoPlan from '../../src/lib/photoPlan.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

const sourceFiles = (dir) =>
  readdirSync(new URL(`../../${dir}`, import.meta.url), { recursive: true })
    .filter((file) => /\.(js|jsx|ts|tsx)$/.test(file))
    .map((file) => `${dir}/${file}`);

describe('issue #947 dead venue access resolver and load-out field cleanup', () => {
  it('removes both dead resolver functions from photoPlan', () => {
    expect(photoPlan).not.toHaveProperty('resolveVenueAccess');
    expect(photoPlan).not.toHaveProperty('mapsUrlFor');
    expect(read('src/lib/photoPlan.js')).not.toMatch(/\b(resolveVenueAccess|mapsUrlFor)\b/);
  });

  it('keeps no production references to the removed resolvers', () => {
    for (const file of sourceFiles('src')) {
      expect(read(file), file).not.toMatch(/\b(resolveVenueAccess|mapsUrlFor)\b/);
    }
  });

  it('removes loadOutMinutes from the domain and the byte-identical Edge mirror', () => {
    const domainPath = 'schema/domains/venue-details.json';
    const installation =
      json(domainPath).properties.venueDetails.properties.installation;
    expect(installation.properties.loadOutMinutes).toBeUndefined();
    expect(installation.properties.loadInMinutes).toBeTruthy();
    expect(installation.properties.setupMinutes).toBeTruthy();
    expect(read('supabase/functions/_shared/domains/venue-details.json')).toBe(read(domainPath));
  });

  it('removes the load-out key from the Google Doc template', () => {
    expect(read('schema/google-doc-template.md')).not.toContain('Load-out minutes:');
  });
});
