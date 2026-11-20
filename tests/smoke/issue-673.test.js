import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../helpers/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));
const template = read('schema/google-doc-template.md');

describe('issue #673 venue-details Google Doc source flags', () => {
  it('keeps the required venue fields and drops windowEnd', () => {
    expect(template).toContain('Venue: Dwór X');
    expect(template).toContain('Address: ');
    expect(template).toContain('Manager name: Anna Kowalska');
    expect(template).toContain('Manager phone: +48 600 000 000');
    expect(template).toContain('Manager email: anna@venue.example');
    expect(template).not.toContain('Installation latest start');
    expect(template).not.toContain('Load-in minutes');
    expect(template).not.toContain('Setup minutes');
    expect(template).not.toContain('Parking:');
    expect(template).not.toContain('Power:');
    expect(template).not.toContain('Loading dock');
    expect(template).not.toContain('Elevator');
    expect(template).not.toContain('Insurance');
    expect(template).not.toContain('Accommodation name:');
    expect(template).not.toContain('Accommodation address:');

    const installation =
      json('schema/domains/venue-details.json').properties.venueDetails.properties.installation;
    for (const key of ['latestStart', 'loadInMinutes', 'setupMinutes', 'parking', 'power', 'loadingDock', 'elevator']) {
      expect(installation.properties[key]).toBeUndefined();
    }
    expect(
      json('schema/google-doc-field-map.json').files['venue-details.example.json'],
    ).not.toHaveProperty('venueDetails.installation.latestStart');
  });

  it('leaves venueDetails out of the cartridge because it is a separate domain contract', () => {
    const { cartridge } = googleDocTemplateToCartridge(parseGoogleDocTemplate(template));
    expect(cartridge).not.toHaveProperty('venueDetails');
  });
});
