import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import MiniSessionTwinTask from '../../src/components/MiniSessionTwinTask.jsx';
import { resolveMiniSessionTwinStepId } from '../../src/lib/photoPlan.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const timeline = [
  { step: { id: 'step_01', time: '16:30', title: 'Cocktail' } },
  { step: { id: 'step_03', time: '18:00', title: 'Grand Entrance' } },
  { step: { id: 'step_05', time: '20:30', title: 'Wedding cake' } },
];

describe('issue #401 mini-session timeline twin task', () => {
  it('places the chosen hour inside the step that covers it', () => {
    expect(resolveMiniSessionTwinStepId(timeline, '17:15')).toBe('step_01');
    expect(resolveMiniSessionTwinStepId(timeline, '19:00')).toBe('step_03');
    expect(resolveMiniSessionTwinStepId(timeline, '21:00')).toBe('step_05');
  });

  it('does not guess when no hour is chosen', () => {
    expect(resolveMiniSessionTwinStepId(timeline, null)).toBeNull();
    expect(resolveMiniSessionTwinStepId(timeline, '')).toBeNull();
  });

  it('renders the private-pictures twin task', () => {
    const html = renderToStaticMarkup(
      createElement(MiniSessionTwinTask, {
        time: '19:00',
        durationMin: 20,
        location: 'Garden',
        backupLocation: 'Ballroom window',
      }),
    );
    expect(html).toContain('Mini session');
    expect(html).toContain('19:00');
    expect(html).toContain('20 min');
    expect(html).toContain('Take the newlyweds outside for private pictures');
    expect(html).toContain('Location: Garden');
    expect(html).toContain('Backup: Ballroom window');
  });

  it('wires the twin task into the photographer timeline without planning changes', () => {
    const photo = read('src/components/PhotographerView.jsx');
    expect(photo).toContain('resolveMiniSessionTwinStepId');
    expect(photo).toContain('<MiniSessionTwinTask');
    expect(photo).toContain("entry.type !== 'miniSession'");
    expect(photo).toContain('Unscheduled — choose the hour');
    expect(read('src/lib/stepDurations.js')).not.toContain('miniSession');
    expect(read('src/lib/driftEngine.js')).not.toContain('miniSession');
  });
});
