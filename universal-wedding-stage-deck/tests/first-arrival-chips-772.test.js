import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MandatoryUpdatePopup from '../src/components/MandatoryUpdatePopup.jsx';
import StepMandatoryNotes from '../src/components/StepMandatoryNotes.jsx';
import { DEMO_WEDDING } from '../src/demo/demoWedding.js';
import {
  mapMandatoryToSteps,
  resolveMandatoryConstraints,
} from '../src/lib/mandatorySteps.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const render = (element) => renderToStaticMarkup(element);

describe('issue #772 remove first-arrival and prestation chips', () => {
  it('no longer maps first-arrival or prestation chips onto steps', () => {
    const mapped = mapMandatoryToSteps(DEMO_WEDDING, DEMO_WEDDING.steps, { role: 'mc' });
    const items = Object.values(mapped).flat();
    expect(items.map((item) => item.kind)).not.toContain('firstArrival');
    expect(items.map((item) => item.kind)).not.toContain('prestationReady');
  });

  it('keeps the first-arrival data for scheduling and anchors', () => {
    const constraints = resolveMandatoryConstraints(DEMO_WEDDING);
    expect(constraints.firstGuestsArrival).toBe('15:30');
    expect(constraints.prestationReady).toBe('14:30');
  });

  it('does not render the chips in the mandatory notes component', () => {
    const html = render(
      createElement(StepMandatoryNotes, {
        showHeading: false,
        items: [
          { kind: 'firstArrival', time: '15:30' },
          { kind: 'prestationReady', time: '14:30' },
          { kind: 'kitchenService', label: 'Dinner', time: '18:30', mode: 'TABLE_SERVICE' },
        ],
      }),
    );
    expect(html).not.toContain('First guests arrival');
    expect(html).not.toContain('Prestation ready');
    expect(html).toContain('Dinner');
  });

  it('does not render the rows in the mandatory update popup', () => {
    const html = render(
      createElement(MandatoryUpdatePopup, {
        weddingId: 'w1',
        role: 'mc',
        update: {
          updatedAt: '2026-11-12T18:00:00.000Z',
          value: DEMO_WEDDING.steps,
        },
      }),
    );
    expect(html).not.toContain('First guests arrival');
    expect(html).not.toContain('Prestation ready');
  });

  it('removes the unused i18n keys', () => {
    for (const locale of ['en', 'fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      expect(dict).not.toContain("'mandatory.firstArrival'");
      expect(dict).not.toContain("'mandatory.prestation'");
    }
    expect(read('src/lib/mandatorySteps.js')).not.toContain("kind: 'firstArrival'");
    expect(read('src/lib/mandatorySteps.js')).not.toContain("kind: 'prestationReady'");
  });
});
