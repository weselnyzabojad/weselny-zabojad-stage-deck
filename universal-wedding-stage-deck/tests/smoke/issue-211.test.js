import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DevViewSwitcher from '../../src/components/DevViewSwitcher.jsx';
import { DEV_VIEW_ROLES, resolveAllowedViewRoles } from '../../src/lib/viewRoles.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #211 development-only all-role switcher', () => {
  it('allows every role view only when the dev gate is on', () => {
    expect(
      resolveAllowedViewRoles({
        isProduction: true,
        baseRole: 'mc',
        availableRoles: ['mc', 'photo', 'speaker'],
        development: true,
      }),
    ).toEqual(DEV_VIEW_ROLES);

    expect(
      resolveAllowedViewRoles({
        isProduction: true,
        baseRole: 'mc',
        availableRoles: ['mc', 'photo', 'speaker'],
        development: false,
      }),
    ).toEqual(['mc']);
  });

  it('renders a clearly marked temporary all-role switcher', () => {
    const html = renderToStaticMarkup(
      createElement(DevViewSwitcher, {
        currentRole: 'photo1',
        onChange: () => {},
      }),
    );
    expect(html).toContain('DEV VIEW SWITCHER');
    expect(html).toContain('not for production');
    for (const label of ['MC', 'DJ', 'Photo 1', 'Photo 2', 'Camera', 'Speaker']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('aria-pressed="true"');
  });

  it('is gated by build-time development detection and rendered in every view', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain('const DEV_VIEW_SWITCHER = import.meta.env.DEV;');
    expect(deck).toContain('{devViewSwitcher}');
    expect(deck.match(/\{devViewSwitcher\}/g)?.length).toBe(5);
  });

  it('does not expose the switcher through public runtime configuration', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).not.toContain('VITE_DEV');
    expect(deck).not.toContain('VITE_VIEW');
  });
});
