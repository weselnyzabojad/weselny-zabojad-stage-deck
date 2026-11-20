import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveActiveAttractions } from '../../src/lib/attractionReminders.js';
import { parseGoogleDocTemplate } from '../../src/lib/googleDocTemplate.js';
import { googleDocTemplateToCartridge } from '../../src/lib/googleDocCartridge.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));

describe('issue #634 attractions booked removal', () => {
  it('removes booked from the schema and example', () => {
    const domain = json('schema/domains/attractions.json');
    expect(domain.properties.attractions.items.properties.booked).toBeUndefined();
    expect(domain.properties.attractions.items.required).not.toContain('booked');
    expect(json('schema/domains/attractions.example.json').attractions[0]).not.toHaveProperty(
      'booked',
    );
    expect(read('src/demo/demoWedding.js')).not.toContain('booked');
  });

  it('maps every attraction row as active', () => {
    const result = googleDocTemplateToCartridge(
      parseGoogleDocTemplate(read('schema/google-doc-template.md')),
    );
    expect(result.cartridge.attractions[0]).not.toHaveProperty('booked');
    expect(result.cartridge.attractions).toHaveLength(3);
    expect(read('schema/google-doc-template.md')).not.toContain('| Booked |');
  });

  it('resolves all present attractions and drops only ended reminders', () => {
    const now = new Date('2026-08-20T20:00:00Z');
    const items = resolveActiveAttractions(
      [
        { id: 'photobooth', startTime: '20:00', endTime: '23:30' },
        { id: 'guestbook', startTime: '18:00', endTime: '23:30' },
        { id: 'past', startTime: '18:00', endTime: '19:00' },
      ],
      { now, eventDateISO: '2026-08-20', timeZone: 'UTC' },
    );
    expect(items.map((item) => item.id)).toEqual(['photobooth', 'guestbook']);
  });
});
