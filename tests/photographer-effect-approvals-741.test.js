import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PhotographerView from '../src/components/PhotographerView.jsx';
import { DEMO_WEDDING } from '../src/demo/demoWedding.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const timeline = [
  {
    step: { id: 'special_effects', title: 'Cake and special effects', type: 'FLEXIBLE' },
    isActive: true,
    isDone: false,
    projectedStart: '21:00',
    projectedEnd: '21:15',
  },
];

const render = () =>
  renderToStaticMarkup(
    createElement(PhotographerView, {
      wedding: DEMO_WEDDING,
      timeline,
      clock: { now: new Date('2026-11-07T12:00:00Z') },
      role: 'photo1',
      theme: 'night',
      onToggleTheme: () => {},
    }),
  );

describe('issue #741 Photographer special-effects approvals UI removal', () => {
  it('renders only the active effect badges', () => {
    const html = render();
    expect(html).toContain('Sparklers');
    expect(html).toContain('Smoke');
    expect(html).toContain('Cold sparks');
    for (const label of [
      'Sparklers approved',
      'Fire approved',
      'Heavy smoke approved',
      'Other effects approved',
    ]) {
      expect(html, label).not.toContain(label);
    }
  });

  it('keeps the approvals data outside the UI', () => {
    const photo = read('src/components/PhotographerView.jsx');
    expect(photo).not.toContain('approvals?.');
    expect(DEMO_WEDDING.photoPlan.specialEffects.approvals).toBeTruthy();
    expect(read('src/lib/photoPlan.js')).toContain('approvals');
  });
});
