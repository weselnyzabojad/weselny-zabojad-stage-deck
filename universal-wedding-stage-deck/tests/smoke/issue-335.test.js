import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #335 mobile 3D current-step card', () => {
  it('limits the tilt to hover-capable fine pointers (#424)', () => {
    const css = read('src/index.css');
    expect(css).toContain('@media (hover: hover) and (pointer: fine)');
    expect(css).not.toContain('perspective: 900px');
    expect(css).not.toContain('rotateX(1.5deg)');
    expect(css).not.toContain('current-step-tilt:active');
  });

  it('preserves fine-pointer tilt and the reduced-motion fallback', () => {
    const css = read('src/index.css');
    expect(css).toContain('rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('transform: none');
  });

  it('keeps the shared wrapper on every role focus stack', () => {
    const stack = read('src/components/TimelineFocusStack.jsx');
    expect(stack).toContain('<CurrentStepTilt>');
    expect(stack).toContain('StageStepCard entry={stack.current}');
  });
});
