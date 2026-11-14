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

describe('issue #775 remove active status chip', () => {
  it('does not render a status chip on the current card', () => {
    const html = renderToStaticMarkup(
      createElement(StageStepCard, { entry, variant: 'current' }),
    );
    expect(html).not.toContain('ON AIR');
    expect(html).not.toContain('Current');
  });

  it('keeps DONE, NEXT and PLANNED chips', () => {
    for (const [variant, label] of [
      ['done', 'DONE'],
      ['next', 'NEXT'],
      ['later', 'PLANNED'],
    ]) {
      const html = renderToStaticMarkup(
        createElement(StageStepCard, { entry, variant }),
      );
      expect(html, variant).toContain(label);
    }
  });

  it('removes the active label from every locale', () => {
    for (const locale of ['en', 'fr', 'pl']) {
      expect(read(`src/i18n/${locale}.js`)).not.toContain("'mc.rail.status.active'");
    }
  });
});
