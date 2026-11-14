import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #424 fine-pointer-only tilt', () => {
  it('checks both hover and pointer capabilities in the tilt handler', () => {
    const tilt = read('src/components/CurrentStepTilt.jsx');
    expect(tilt).toContain('(hover: hover) and (pointer: fine)');
    expect(tilt).toContain("event.pointerType === 'touch'");
    expect(tilt).toContain('!finePointer()');
    expect(tilt).toContain('const MAX_TILT_DEG = 6');
  });

  it('scopes the perspective and rotation to fine pointers', () => {
    const css = read('src/index.css');
    expect(css).toContain('@media (hover: hover) and (pointer: fine)');
    expect(css).not.toContain('perspective: 900px');
    expect(css).not.toContain('rotateX(1.5deg)');
    expect(css).toMatch(
      /@media \(hover: hover\) and \(pointer: fine\)[\s\S]*rotateX\(var\(--tilt-x, 0deg\)\)/,
    );
  });

  it('keeps reduced motion flat and the transition comment accurate', () => {
    const css = read('src/index.css');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('transition: transform 120ms ease-out');
    expect(css).toContain('120ms');
    expect(css).not.toContain('deliberately no transition');
  });
});
