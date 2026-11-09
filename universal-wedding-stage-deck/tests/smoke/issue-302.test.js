import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import StepMandatoryNotes from '../../src/components/StepMandatoryNotes.jsx';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';
import {
  mapMandatoryToSteps,
  resolveMandatoryConstraints,
} from '../../src/lib/mandatorySteps.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const render = (props) => renderToStaticMarkup(createElement(StepMandatoryNotes, props));
const allItems = (mapped) => Object.values(mapped).flat();

describe('issue #302 mandatory constraints', () => {
  it('derives prestation ready one hour before first arrival', () => {
    const constraints = resolveMandatoryConstraints(DEMO_WEDDING);
    expect(constraints.firstGuestsArrival).toBe('15:30');
    expect(constraints.prestationReady).toBe('14:30');
  });

  it('exposes kitchen service modes from the venue manager data', () => {
    const constraints = resolveMandatoryConstraints(DEMO_WEDDING);
    expect(constraints.kitchenServices).toEqual([
      expect.objectContaining({ key: 'dinner', time: '18:30', mode: 'TABLE_SERVICE' }),
      expect.objectContaining({ key: 'supper_1', time: '21:30', mode: 'TABLE_SERVICE' }),
      expect.objectContaining({ key: 'supper_2', time: '23:30', mode: 'BUFFET' }),
    ]);
  });

  it('applies venue-manager overrides, including buffet mode', () => {
    const constraints = resolveMandatoryConstraints(DEMO_WEDDING, {
      value: {
        firstGuestsArrival: '16:00',
        kitchenServices: [{ id: 'dinner', time: '19:00', serviceMode: 'BUFFET' }],
      },
    });
    expect(constraints.prestationReady).toBe('15:00');
    expect(constraints.kitchenServices[0]).toMatchObject({
      key: 'dinner',
      time: '19:00',
      modeLabel: 'Buffet',
    });
  });

  it('embeds all MC constraints into their steps, including buffets', () => {
    const mapped = mapMandatoryToSteps(DEMO_WEDDING, DEMO_WEDDING.steps, { role: 'mc' });
    const html = render({ items: allItems(mapped) });
    expect(html).toContain('First guests arrival');
    expect(html).toContain('Prestation ready (derived)');
    expect(html).toContain('Dinner');
    expect(html).toContain('Buffet');
    expect(html).toContain('Cake');
  });

  it('shows first arrival on DJ VIP but not kitchen detail', () => {
    const mapped = mapMandatoryToSteps(DEMO_WEDDING, DEMO_WEDDING.steps, {
      role: 'dj',
      isVipDj: true,
    });
    const items = allItems(mapped);
    expect(items.map((item) => item.kind)).toEqual(['firstArrival']);
    const html = render({ items });
    expect(html).toContain('First guests arrival');
    expect(html).not.toContain('Dinner');
    expect(html).not.toContain('Cake');
  });

  it('hides mandatory constraints from DJ Standard and other roles', () => {
    expect(mapMandatoryToSteps(DEMO_WEDDING, DEMO_WEDDING.steps, { role: 'dj' })).toEqual({});
    expect(mapMandatoryToSteps(DEMO_WEDDING, DEMO_WEDDING.steps, { role: 'photographer_1' })).toEqual({});
    expect(mapMandatoryToSteps(DEMO_WEDDING, DEMO_WEDDING.steps, { role: 'venue_manager' })).toEqual({});
  });

  it('keeps prestation ready derived and non-editable in Venue Manager', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).not.toContain('label="First guests arrival"');
    expect(venue).not.toContain('label="Prestation ready"');
    expect(venue).toContain('venueManager.prestationHelper');
  });

  it('supports table service and buffet in schema and venue manager UI', () => {
    const schema = JSON.parse(read('schema/wedding-schema-v1.1.json'));
    const courses = schema.properties.mandatorySteps.properties.kitchenServices;
    expect(courses.items.properties.serviceMode.enum).toEqual(['TABLE_SERVICE', 'BUFFET']);
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).toContain('mandatory.serviceMode.TABLE_SERVICE');
    expect(venue).toContain('mandatory.serviceMode.BUFFET');
  });
});
