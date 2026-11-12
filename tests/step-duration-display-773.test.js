import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import StageStepCard from '../src/components/StageStepCard.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const entry = {
  step: {
    id: 'step_01',
    time: '15:30',
    durationMin: 60,
    title: 'First guests arrival',
    type: 'HARD_ANCHOR',
    location: 'Garden',
  },
  index: 0,
  projectedStart: '15:30',
  projectedEnd: '16:30',
};

describe('issue #773 remove step duration display', () => {
  it('does not render the duration label in the card body', () => {
    const html = renderToStaticMarkup(
      createElement(StageStepCard, { entry, variant: 'later' }),
    );
    expect(html).not.toContain('60 min');
  });

  it('keeps the location, drift and completed labels', () => {
    const html = renderToStaticMarkup(
      createElement(StageStepCard, {
        entry: { ...entry, isDone: true, projectedDriftMinutes: 4, driftLabel: '4 min late' },
        variant: 'done',
      }),
    );
    expect(html).toContain('Garden');
    expect(html).toContain('+4m');
    expect(html).toContain('DONE');
  });

  it('keeps durationMin in the step data and engine', () => {
    expect(read('src/components/StageStepCard.jsx')).not.toContain('durationMin');
    expect(read('src/lib/driftEngine.js')).toContain('step.durationMin');
    expect(read('schema/domains/steps.json')).toContain('"durationMin"');
  });
});
