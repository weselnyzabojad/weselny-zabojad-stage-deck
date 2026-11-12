import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #425 compact focus stack has no overlap', () => {
  const css = read('src/index.css');

  it('scopes the -1rem overlap and scale to wide layouts only', () => {
    const wideMedia = css.indexOf('@media (min-width: 640px)');
    expect(wideMedia).toBeGreaterThan(-1);
    expect(css.indexOf('margin-top: -1rem')).toBeGreaterThan(wideMedia);
    expect(css.indexOf('transform: scale(0.95)')).toBeGreaterThan(wideMedia);
  });

  it('keeps both history and future depth rules inside the wide media query', () => {
    for (const zone of ['history', 'future']) {
      const rule = `[data-focus-zone="${zone}"] [data-focus-depth="2"]`;
      expect(css).toContain(rule);
      expect(css.indexOf('@media (min-width: 640px)')).toBeLessThan(
        css.indexOf(rule),
      );
    }
  });

  it('leaves the compact stack as a plain list with the same visible limits', () => {
    const stack = read('src/components/TimelineFocusStack.jsx');
    expect(stack).toContain('flex flex-col gap-2');
    expect(stack).not.toContain('margin-top: -1rem');
    expect(stack).not.toContain('scale(0.95)');
  });
});
