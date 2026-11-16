import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DevViewSwitcher from '../src/components/DevViewSwitcher.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const STEPS = [
  { id: 'first', time: '15:30', title: 'First guests arrival' },
  { id: 'middle', time: '16:30', title: 'Cocktail' },
  { id: 'last', time: '17:00', title: 'Ceremony' },
];

describe('issue #762 dev step navigator', () => {
  it('renders the step picker with every enabled step and the current position', () => {
    const html = renderToStaticMarkup(
      createElement(DevViewSwitcher, {
        currentRole: 'mc',
        steps: STEPS,
        currentStepId: 'middle',
        previewEnabled: true,
        defaultOpen: true,
      }),
    );

    expect(html).toContain('data-testid="dev-step-navigator"');
    expect(html).toContain('DEV STEP PREVIEW');
    expect(html).toContain('2/3');
    expect(html).toContain('1. 15:30 — First guests arrival');
    expect(html).toContain('2. 16:30 — Cocktail');
    expect(html).toContain('3. 17:00 — Ceremony');
    expect(html).toContain('aria-label="Development preview step"');
    expect(html).toContain('aria-label="Previous step"');
    expect(html).toContain('aria-label="Next step"');
  });

  it('does not render the step section outside preview mode', () => {
    const html = renderToStaticMarkup(
      createElement(DevViewSwitcher, {
        currentRole: 'mc',
        steps: STEPS,
        currentStepId: 'middle',
        previewEnabled: false,
      }),
    );

    expect(html).not.toContain('data-testid="dev-step-navigator"');
    expect(html).not.toContain('DEV STEP PREVIEW');
  });

  it('wires role and step callbacks, including previous/next boundaries', () => {
    const switcher = read('src/components/DevViewSwitcher.jsx');
    expect(switcher).toContain('onClick={() => onChange?.(role)}');
    expect(switcher).toContain('onChange={(event) => onStepChange?.(event.target.value)}');
    expect(switcher).toContain('onClick={() => onStepChange?.(previousStepId)}');
    expect(switcher).toContain('onClick={() => onStepChange?.(nextStepId)}');
    expect(switcher).toContain('disabled={!previousStepId}');
    expect(switcher).toContain('disabled={!nextStepId}');
    expect(switcher).toContain('adjacentStepId(steps, currentStepId, -1)');
    expect(switcher).toContain('adjacentStepId(steps, currentStepId, 1)');
  });

  it('collapses by default and respects the viewport guard', () => {
    const switcher = read('src/components/DevViewSwitcher.jsx');
    expect(switcher).toContain('const [open, setOpen] = useState(defaultOpen)');
    expect(switcher).toContain('if (!previewEnabled) return null;');
    expect(switcher).toContain('max-h-[45dvh]');
    expect(switcher).toContain('sm:flex-col-reverse');
    expect(switcher).toContain('top-3');
    expect(switcher).toContain('sm:bottom-3');
  });

  it('wires the navigator into every dev view branch', () => {
    const deck = read('src/StageDeck.jsx');

    expect(deck).toContain('onStepChange={handleDevStepChange}');
    expect(deck).toContain('previewEnabled={DEV_PREVIEW}');
    expect(deck).toContain('steps={steps}');
    expect(deck).toContain('currentStepId={liveState.active_step_id}');
    expect(deck).toContain('devJumpToStep(nextStepId)');
    expect(deck).toContain('setOverlay(null);');
    expect(deck.match(/\{devViewSwitcher\}/g)?.length).toBe(7);
  });

  it('documents the step preview workflow', () => {
    const docs = read('docs/dev-tools.md');
    expect(docs).toContain('STEP PREVIEW (`?dev=1`)');
    expect(docs).toContain('never creates a Supabase client');
    expect(docs).toContain('previous/next');
    expect(docs).toContain('45dvh');
  });
});

