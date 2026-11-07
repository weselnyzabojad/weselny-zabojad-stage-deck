import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GrandEntranceCueCard from '../../src/components/GrandEntranceCueCard.jsx';
import { resolveGrandEntranceOrder } from '../../src/lib/grandEntrance.js';
import { DEMO_WEDDING } from '../../src/demo/demoWedding.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #304 Grand Entrance guest order', () => {
  it('validates both orders in the schema', () => {
    const schema = JSON.parse(read('schema/wedding-schema-v1.1.json'));
    expect(schema.$defs.step.properties.grandEntranceOrder.enum).toEqual([
      'GUESTS_FIRST',
      'NEWLYWEDS_FIRST',
    ]);
  });

  it('resolves guests first and newlyweds first', () => {
    expect(resolveGrandEntranceOrder({ grandEntranceOrder: 'GUESTS_FIRST' })).toMatchObject({
      label: 'Guests first, newlyweds after',
    });
    expect(resolveGrandEntranceOrder({ grandEntranceOrder: 'NEWLYWEDS_FIRST' })).toMatchObject({
      label: 'Newlyweds first, guests after',
    });
  });

  it('fails safely when the order is missing or unknown', () => {
    expect(resolveGrandEntranceOrder({})).toBeNull();
    expect(resolveGrandEntranceOrder({ grandEntranceOrder: 'SOMETHING' })).toBeNull();
    expect(
      renderToStaticMarkup(createElement(GrandEntranceCueCard, { step: {} })),
    ).toBe('');
  });

  it('renders the sequence on the MC cue', () => {
    const html = renderToStaticMarkup(
      createElement(GrandEntranceCueCard, {
        step: { grandEntranceOrder: 'GUESTS_FIRST' },
      }),
    );
    expect(html).toContain('Grand Entrance order');
    expect(html).toContain('Guests first, newlyweds after');
    expect(html).toContain('1. Guests');
  });

  it('carries the order in the demo cartridge and Google Doc template', () => {
    const entrance = DEMO_WEDDING.steps.find((step) => step.id === 'step_03');
    expect(entrance.grandEntranceOrder).toBe('NEWLYWEDS_FIRST');
    expect(read('schema/google-doc-template.md')).toContain(
      'Guest order: newlyweds first, guests after.',
    );
  });

  it('shows the cue in MC view', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('GrandEntranceCueCard');
    expect(mc).toContain('currentStep.grandEntranceOrder');
  });
});
