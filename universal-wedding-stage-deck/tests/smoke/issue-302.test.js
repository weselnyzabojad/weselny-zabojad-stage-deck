import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MandatoryConstraintsCard from '../../src/components/MandatoryConstraintsCard.jsx';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';
import { resolveMandatoryConstraints } from '../../src/lib/mandatorySteps.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const render = (props) => renderToStaticMarkup(createElement(MandatoryConstraintsCard, props));

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
      expect.objectContaining({ key: 'firstSupper', time: '21:30', mode: 'TABLE_SERVICE' }),
      expect.objectContaining({ key: 'secondSupper', time: '23:30', mode: 'BUFFET' }),
    ]);
  });

  it('applies venue-manager overrides, including buffet mode', () => {
    const constraints = resolveMandatoryConstraints(DEMO_WEDDING, {
      value: {
        firstGuestsArrival: '16:00',
        kitchenServices: { dinner: '19:00' },
        kitchenServiceModes: { dinner: 'BUFFET' },
      },
    });
    expect(constraints.prestationReady).toBe('15:00');
    expect(constraints.kitchenServices[0]).toMatchObject({
      key: 'dinner',
      time: '19:00',
      modeLabel: 'Buffet',
    });
  });

  it('shows all MC constraints including buffets', () => {
    const html = render({ wedding: DEMO_WEDDING, role: 'mc' });
    expect(html).toContain('First guests arrival');
    expect(html).toContain('Prestation ready (derived)');
    expect(html).toContain('Obiad weselny');
    expect(html).toContain('Buffet');
    expect(html).toContain('Cake');
  });

  it('shows first arrival on DJ VIP but not kitchen detail', () => {
    const html = render({ wedding: DEMO_WEDDING, role: 'dj', isVipDj: true });
    expect(html).toContain('First guests arrival');
    expect(html).not.toContain('Obiad weselny');
    expect(html).not.toContain('Cake');
  });

  it('hides mandatory constraints from DJ Standard and other roles', () => {
    expect(render({ wedding: DEMO_WEDDING, role: 'dj', isVipDj: false })).toBe('');
    expect(render({ wedding: DEMO_WEDDING, role: 'photographer_1' })).toBe('');
    expect(render({ wedding: DEMO_WEDDING, role: 'venue_manager' })).toBe('');
  });

  it('keeps prestation ready derived and non-editable in Venue Manager', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).not.toContain('label="First guests arrival"');
    expect(venue).not.toContain('label="Prestation ready"');
    expect(venue).toContain('venueManager.prestationHelper');
  });

  it('supports table service and buffet in schema and venue manager UI', () => {
    const schema = JSON.parse(read('schema/wedding-schema-v1.1.json'));
    const modes = schema.properties.mandatorySteps.properties.kitchenServiceModes;
    expect(modes.properties.dinner.enum).toEqual(['TABLE_SERVICE', 'BUFFET']);
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).toContain('mandatory.serviceMode.TABLE_SERVICE');
    expect(venue).toContain('mandatory.serviceMode.BUFFET');
  });
});
