import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import DevViewSwitcher from '../src/components/DevViewSwitcher.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const STEPS = [
  { id: 'first', time: '15:30', title: 'First guests arrival' },
  { id: 'middle', time: '16:30', title: 'Cocktail' },
  { id: 'last', time: '17:00', title: 'Ceremony' },
];

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, visit));
    return;
  }
  visit(node);
  const children = node.props?.children;
  if (Array.isArray(children)) children.forEach((child) => walk(child, visit));
  else walk(children, visit);
}

function find(tree, predicate) {
  let match = null;
  walk(tree, (node) => {
    if (!match && predicate(node)) match = node;
  });
  return match;
}

describe('issue #762 dev step navigator', () => {
  it('renders the step picker with every enabled step and the current position', () => {
    const html = renderToStaticMarkup(
      createElement(DevViewSwitcher, {
        currentRole: 'mc',
        steps: STEPS,
        currentStepId: 'middle',
        previewEnabled: true,
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
    const onRoleChange = vi.fn();
    const onStepChange = vi.fn();
    const tree = DevViewSwitcher({
      currentRole: 'mc',
      steps: STEPS,
      currentStepId: 'middle',
      previewEnabled: true,
      onChange: onRoleChange,
      onStepChange,
    });

    const roleButton = find(
      tree,
      (node) => node.type === 'button' && node.props?.children === 'DJ',
    );
    roleButton.props.onClick();
    expect(onRoleChange).toHaveBeenCalledWith('dj');

    const select = find(tree, (node) => node.type === 'select');
    select.props.onChange({ target: { value: 'last' } });
    expect(onStepChange).toHaveBeenCalledWith('last');

    const previous = find(
      tree,
      (node) => node.props?.['aria-label'] === 'Previous step',
    );
    const next = find(tree, (node) => node.props?.['aria-label'] === 'Next step');
    expect(previous.props.disabled).toBe(false);
    expect(next.props.disabled).toBe(false);
    previous.props.onClick();
    next.props.onClick();
    expect(onStepChange).toHaveBeenNthCalledWith(2, 'first');
    expect(onStepChange).toHaveBeenNthCalledWith(3, 'last');

    const firstTree = DevViewSwitcher({
      currentRole: 'mc',
      steps: STEPS,
      currentStepId: 'first',
      previewEnabled: true,
      onStepChange,
    });
    const firstPrevious = find(
      firstTree,
      (node) => node.props?.['aria-label'] === 'Previous step',
    );
    expect(firstPrevious.props.disabled).toBe(true);

    const lastTree = DevViewSwitcher({
      currentRole: 'mc',
      steps: STEPS,
      currentStepId: 'last',
      previewEnabled: true,
      onStepChange,
    });
    const lastNext = find(
      lastTree,
      (node) => node.props?.['aria-label'] === 'Next step',
    );
    expect(lastNext.props.disabled).toBe(true);
  });

  it('uses the explicit mobile opt-in and respects the viewport guard', () => {
    const switcher = read('src/components/DevViewSwitcher.jsx');
    expect(switcher).toContain("previewEnabled ? 'block' : 'hidden'");
    expect(switcher).toContain('max-h-[45dvh]');
    expect(switcher).toContain('sm:block');
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
    expect(deck.match(/\{devViewSwitcher\}/g)?.length).toBe(6);
  });

  it('documents the step preview workflow', () => {
    const docs = read('docs/dev-tools.md');
    expect(docs).toContain('STEP PREVIEW (`?dev=1`)');
    expect(docs).toContain('never creates a Supabase client');
    expect(docs).toContain('previous/next');
    expect(docs).toContain('45dvh');
  });
});
