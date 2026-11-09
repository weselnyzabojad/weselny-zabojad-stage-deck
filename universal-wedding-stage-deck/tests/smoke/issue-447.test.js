import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #447 venue course grouping', () => {
  it('keeps each course time and service mode in one CourseCard', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).toContain('function CourseCard');
    expect(venue).toContain('venueManager.time');
    expect(venue).toContain('venueManager.serviceModeLabel');
    expect(venue).toContain('KITCHEN_MODE_FIELDS.map');
    const courseCard = venue.slice(
      venue.indexOf('function CourseCard'),
      venue.indexOf('export default function VenueManagerView'),
    );
    expect(courseCard).toContain('TimeField');
    expect(courseCard).toContain('<select');
  });

  it('renders cake and closure/extension in separate cards', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).toContain('venueManager.cakeService');
    expect(venue).toContain('venueManager.closure');
    expect(venue).toContain('venueManager.extension');
    expect(venue).toContain('closureExtensionAllowed');
  });

  it('uses a responsive grid and stable data keys', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).toContain('sm:grid-cols-2');
    expect(venue).toContain('lg:grid-cols-3');
    expect(venue).toContain('kitchenServices');
    expect(venue).toContain('kitchenServiceModes');
    expect(venue).toContain('cakeServiceMode');
    expect(venue).toContain('closureTime');
  });

  it('defines localized course labels in every locale', () => {
    const keys = [
      'venueManager.time',
      'venueManager.serviceModeLabel',
      'venueManager.course.dinner',
      'venueManager.course.firstSupper',
      'venueManager.course.secondSupper',
      'venueManager.course.thirdSupper',
    ];
    for (const locale of ['en', 'fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of keys) {
        expect(dict, `${locale}:${key}`).toContain(`'${key}'`);
      }
    }
  });
});
