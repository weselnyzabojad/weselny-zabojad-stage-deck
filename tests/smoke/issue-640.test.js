import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveVenueTimeZone } from '../../src/lib/eventTime.js';
import { resolveVenueAccess } from '../../src/lib/photoPlan.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #640 venue-details timezone and access notes cleanup', () => {
  it('removes both fields from the domain and example', () => {
    const domain = json('schema/domains/venue-details.json');
    const venue = domain.properties.venueDetails;
    expect(venue.properties.timezone).toBeUndefined();
    expect(venue.properties.installation.properties.accessNotes).toBeUndefined();
    const example = json('schema/domains/venue-details.example.json').venueDetails;
    expect(example).not.toHaveProperty('timezone');
    expect(example.installation).not.toHaveProperty('accessNotes');
  });

  it('keeps the remaining venue fields', () => {
    const example = json('schema/domains/venue-details.example.json').venueDetails;
    expect(example.address).toBeTruthy();
    expect(example.coordinates.latitude).toBeTruthy();
    expect(example.manager.name).toBeTruthy();
    expect(example.installation.windowStart).toBeTruthy();
    expect(example.notes).toBeTruthy();
  });

  it('falls back safely when the venue timezone is gone', () => {
    expect(resolveVenueTimeZone({ timezone: 'Europe/Warsaw' })).toBe('Europe/Warsaw');
    expect(
      resolveVenueTimeZone({
        timezone: 'UTC',
        venueDetails: { timezone: 'Europe/Warsaw' },
      }),
    ).toBe('UTC');
    expect(resolveVenueTimeZone({})).toBeTruthy();
  });

  it('resolves venue access without access notes', () => {
    const access = resolveVenueAccess(json('schema/domains/venue-details.example.json'));
    expect(access.installation).not.toHaveProperty('accessNotes');
    expect(access.installation.windowStart).toBe('12:00');
    expect(access.manager.name).toBeTruthy();
    expect(access.address).toBeTruthy();
  });

  it('drops the removed template keys', () => {
    expect(read('schema/google-doc-template.md')).not.toContain('Access notes:');
    expect(read('schema/google-doc-template.md')).not.toContain('Timezone: Europe/Warsaw');
  });
});
