import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import StageStepCard from '../../src/components/StageStepCard.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const entry = {
  index: 2,
  step: { id: 'step_03', time: '18:00', durationMin: 30, title: 'Grand Entrance', type: 'FLEXIBLE' },
  isActive: true,
  projectedStart: '18:00',
  projectedEnd: '18:30',
};

describe('issue #310 no numeric step labels on cards', () => {
  it('does not render "Step N" in a step card', () => {
    const html = renderToStaticMarkup(createElement(StageStepCard, { entry, variant: 'current' }));
    expect(html).not.toMatch(/Step\s+\d/);
    expect(html).toContain('Grand Entrance');
  });

  it('removes the label from the shared card component', () => {
    const card = read('src/components/StageStepCard.jsx');
    expect(card).not.toContain('Step {typeof entry.index');
    expect(card).not.toContain('Step {entry.index');
  });

  it('removes the label from MC desktop and pocket cards', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).not.toContain('Step {currentEntry.index + 1}');
    expect(mc).toContain('completed');
  });

  it('uses the current FLEXIBLE style fallback', () => {
    expect(read('src/StageDeck.jsx')).toContain('STEP_TYPE_STYLES.FLEXIBLE');
    expect(read('src/StageDeck.jsx')).not.toContain('STEP_TYPE_STYLES.ELASTIC');
  });
});
