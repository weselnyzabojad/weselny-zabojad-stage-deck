import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AdminVenueLocationEditor from '../src/admin/AdminVenueLocationEditor.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const wedding = {
  wedding_id: 'W-UM-2026-08-001',
  venue_name: 'Dwór Pod Lipami',
  venue_address: 'ul. Lipowa 12',
  venue_city: 'Warszawa',
  venue_country: 'PL',
  archived_at: null,
};

function render(overrides = {}) {
  return renderToStaticMarkup(
    createElement(AdminVenueLocationEditor, {
      wedding,
      ...overrides,
    }),
  );
}

describe('issue #1214 wedding venue location admin editor', () => {
  it('renders all four fields and the public-visibility helper', () => {
    const html = render();
    expect(html).toContain('Venue location');
    expect(html).toContain('Venue name');
    expect(html).toContain('Address');
    expect(html).toContain('City');
    expect(html).toContain('Country');
    expect(html).toContain('value="Dwór Pod Lipami"');
    expect(html).toContain('value="ul. Lipowa 12"');
    expect(html).toContain('value="Warszawa"');
    expect(html).toContain('City and country may appear publicly');
    expect(html).toContain('Save venue');
    expect(html).toContain('Cancel');
  });

  it('pre-fills the country suggestion when the stored country is blank', () => {
    const html = render({
      wedding: { ...wedding, venue_country: '', venue_city: 'Lyon', venue_address: '1 rue X, 69001' },
    });
    expect(html).toContain('Suggested from city/address: FR');
    expect(html).toContain('<option value="FR" selected="">FR</option>');
  });

  it('explains an unresolved country instead of guessing', () => {
    const html = render({
      wedding: { ...wedding, venue_city: 'Atlantis', venue_address: '', venue_country: '' },
    });
    expect(html).toContain('No deterministic suggestion; leave blank if unknown.');
    expect(html).not.toContain('Suggested from city/address');
  });

  it('disables editing and saving for archived or read-only weddings', () => {
    const html = render({ readOnly: true });
    expect(html).toContain('Editing is disabled while the admin is read-only');
    expect(html).toContain('disabled=""');
    expect(html).toContain('Save venue');
  });

  it('wires save, cancel, validation and the four-field API payload', () => {
    const editor = read('src/admin/AdminVenueLocationEditor.jsx');
    expect(editor).toContain('updateWeddingVenue({');
    expect(editor).toContain('weddingId: wedding?.wedding_id');
    expect(editor).toContain('venueName: values.name');
    expect(editor).toContain('venueAddress: values.address');
    expect(editor).toContain('venueCity: values.city');
    expect(editor).toContain('venueCountry: normalized ??');
    expect(editor).toContain('const reset = () =>');
    expect(editor).toContain('setValues(initialValues(wedding))');
    expect(editor).toContain('Use a two-letter ISO country code');
    expect(editor).toContain('role="alert"');
    expect(editor).toContain('Venue location saved.');
    expect(editor).toContain('onSaved');
    expect(editor).toContain('resolveVenueCountry');
    expect(editor).toContain('normalizeCountry');
    for (const unrelated of ['couple:', 'date:', 'cartridge:', 'archived_at:']) {
      expect(editor).not.toContain(unrelated);
    }
  });

  it('renders every editor in the admin wedding detail and keeps archive safety', () => {
    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain("import AdminVenueLocationEditor from './AdminVenueLocationEditor';");
    expect(app).toContain('<AdminVenueLocationEditor');
    expect(app).toContain('readOnly={readOnly || Boolean(wedding.archived_at)}');
    expect(app).toContain('onSaved={load}');

    const api = read('src/admin/adminApi.js');
    expect(api).toContain('export async function updateWeddingVenue');
    expect(api).toContain("callAdmin('update_wedding_venue', payload)");
    expect(api).toContain("demoMutate('update_wedding_venue')");
  });

  it('provides demo venue data and disables demo edits', () => {
    const demo = read('src/admin/adminDemoApi.js');
    expect(demo).toContain('venue_name:');
    expect(demo).toContain('venue_city:');
    expect(demo).toContain('venue_country:');
    const editor = read('src/admin/AdminVenueLocationEditor.jsx');
    expect(editor).toContain('Demo preview: venue edits are disabled.');
    expect(editor).toContain('ADMIN_DEMO');
  });
});
