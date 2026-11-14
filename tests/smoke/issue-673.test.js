import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

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
    expect(template).not.toContain('Installation window end');
    expect(template).not.toContain('Latitude: 51.05');
    expect(template).not.toContain('Installation window start');

    const installation =
      json('schema/domains/venue-details.json').properties.venueDetails.properties.installation;
    expect(installation.properties.windowEnd).toBeUndefined();
    expect(json('schema/domains/venue-details.example.json').venueDetails.installation).not.toHaveProperty(
      'windowEnd',
    );
    expect(
      json('schema/google-doc-field-map.json').files['venue-details.example.json'],
    ).not.toHaveProperty('venueDetails.installation.windowEnd');
  });

  it('leaves venueDetails out of the cartridge because it is a separate domain contract', () => {
    const { cartridge } = googleDocTemplateToCartridge(parseGoogleDocTemplate(template));
    expect(cartridge).not.toHaveProperty('venueDetails');
  });
});
