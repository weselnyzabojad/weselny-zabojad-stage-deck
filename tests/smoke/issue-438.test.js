import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SecondaryControlBar from '../../src/components/SecondaryControlBar.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #438 compact secondary bar', () => {
  it('stacks below the compact breakpoint and restores three columns above it', () => {
    const source = read('src/components/SecondaryControlBar.jsx');
    expect(source).toContain('grid-cols-1');
    expect(source).toContain('sm:grid-cols-[1fr_auto_1fr]');
    expect(source).toContain('flex-wrap');
    expect(source).toContain('min-w-0');
    expect(source).toContain('sm:justify-end');
  });

  it('keeps logical left → centre → right reading order', () => {
    const html = renderToStaticMarkup(
      createElement(SecondaryControlBar, {
        left: createElement('span', null, 'LEFT'),
        center: createElement('span', null, 'CENTER'),
        right: createElement('span', null, 'RIGHT'),
      }),
    );
    expect(html.indexOf('LEFT')).toBeLessThan(html.indexOf('CENTER'));
    expect(html.indexOf('CENTER')).toBeLessThan(html.indexOf('RIGHT'));
  });

  it('is shared by the MC and read-only role views', () => {
    for (const path of [
      'src/views/McMasterView.jsx',
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/SpeakerView.jsx',
      'src/components/VenueManagerView.jsx',
    ]) {
      expect(read(path), path).toContain('<SecondaryControlBar');
    }
  });
});
