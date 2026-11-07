import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import SecondaryControlBar from '../../src/components/SecondaryControlBar.jsx';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #391 full-width secondary bar', () => {
  it('removes the max-width cap and stretches to the viewport', () => {
    const source = read('src/components/SecondaryControlBar.jsx');
    expect(source).not.toContain('max-w-7xl');
    expect(source).toContain('w-full');
    expect(source).toContain('px-4');
  });

  it('keeps left, center and right groups aligned', () => {
    const html = renderToStaticMarkup(
      createElement(SecondaryControlBar, {
        left: createElement('span', null, 'LEFT'),
        center: createElement('span', null, 'CENTER'),
        right: createElement('span', null, 'RIGHT'),
      }),
    );
    expect(html).toContain('grid-cols-[1fr_auto_1fr]');
    expect(html).toContain('LEFT');
    expect(html).toContain('CENTER');
    expect(html).toContain('RIGHT');
    expect(html).toContain('justify-end');
  });
});
