import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1023 shared timeline focus hierarchy', () => {
  it('makes the current card the unmistakable focal point', () => {
    const card = read('src/components/StageStepCard.jsx');
    expect(card).toContain('border-2 border-brand-strong bg-card shadow-2xl ring-2 ring-brand-strong/50');
    expect(card).toContain("variant === 'current' ? 'text-base font-bold' : 'text-sm font-semibold'");
  });

  it('mutes completed and upcoming cards to roughly 70%', () => {
    const stack = read('src/components/TimelineFocusStack.jsx');
    expect(stack).toContain("zone === 'current' ? 1 : Math.min(tier?.opacity ?? 0.7, 0.7)");
    const card = read('src/components/StageStepCard.jsx');
    expect(card).toContain('bg-emerald-500/5');
    expect(card).toContain('bg-amber-500/5');
  });

  it('applies the shared treatment by default to every role timeline', () => {
    const stack = read('src/components/TimelineFocusStack.jsx');
    expect(stack).toContain('polished = true');
    expect(stack).not.toContain('MC Master-only');
  });

  it('keeps the 2 + 1 + 2 visibility model and reduced-motion behavior', () => {
    const stack = read('src/components/TimelineFocusStack.jsx');
    expect(stack).toContain('buildFocusStack(entries, activeIndex)');
    expect(read('src/components/StageStepCard.jsx')).toContain('motion-reduce');
    const focus = read('src/lib/focusStack.js');
    expect(focus).toContain('history: 2');
    expect(focus).toContain('future: 2');
  });
});
