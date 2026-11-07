import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #295 Current Step 3D tilt', () => {
  const tilt = read('src/components/CurrentStepTilt.jsx');
  const css = read('src/index.css');
  const stack = read('src/components/TimelineFocusStack.jsx');
  const card = read('src/components/StageStepCard.jsx');

  it('uses a lightweight pointer tilt with a 6 degree bound', () => {
    expect(tilt).toContain('const MAX_TILT_DEG = 6');
    expect(tilt).toContain('requestAnimationFrame');
    expect(tilt).not.toContain('framer-motion');
    expect(stack).toContain('<CurrentStepTilt>');
  });

  it('uses perspective and Z-axis elevation for the header/body', () => {
    expect(css).toContain('perspective: 1000px');
    expect(css).toContain('translateZ(26px)');
    expect(css).toContain('translateZ(8px)');
    expect(css).toContain('transform-style: preserve-3d');
    expect(card).toContain('current-step-header');
  });

  it('falls back to flat rendering for reduced motion', () => {
    expect(tilt).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toMatch(/\.current-step-tilt\s*\{\s*perspective:\s*none;/);
    expect(css).toContain('transform: none;');
  });
});
