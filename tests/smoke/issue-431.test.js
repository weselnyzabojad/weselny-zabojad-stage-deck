import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import StageStepCard from '../../src/components/StageStepCard.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const LONG_TITLE = 'Cocktail / Vin d’honneur avec les invités et la famille';

describe('issue #431 StageStepCard title clamp', () => {
  it('wraps long titles to two lines instead of truncating them', () => {
    const card = read('src/components/StageStepCard.jsx');
    expect(card).toContain('line-clamp-2 break-words');
    expect(card).not.toMatch(/truncate font-heading text-sm font-semibold/);
  });

  it('renders the full title and a time row below it on mobile', () => {
    const html = renderToStaticMarkup(
      createElement(StageStepCard, {
        entry: {
          index: 0,
          step: { id: 'step_1', title: LONG_TITLE, location: 'Garden' },
          projectedStart: '18:00',
          projectedEnd: '19:30',
        },
        variant: 'done',
      }),
    );

    expect(html).toContain(LONG_TITLE);
    expect(html).toContain('18:00–19:30');
    expect(html).toContain('line-clamp-2');
    expect(html).toContain('flex-col');
    expect(html).toContain('sm:flex-row');
  });

  it('keeps the full title in the accessible name', () => {
    const html = renderToStaticMarkup(
      createElement(StageStepCard, {
        entry: {
          index: 0,
          step: { id: 'step_1', title: LONG_TITLE },
          projectedStart: '18:00',
          projectedEnd: '19:30',
        },
        variant: 'done',
        collapsible: true,
        onToggle: () => {},
      }),
    );
    expect(html).toContain(`aria-label="Collapse ${LONG_TITLE}"`);
  });
});
