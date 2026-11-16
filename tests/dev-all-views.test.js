import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DevViewSwitcher from '../src/components/DevViewSwitcher.jsx';
import { ROLE_ORDER } from '../src/lib/roles.js';
import {
  DEV_VIEW_ROLES,
  resolveAllowedViewRoles,
  resolveViewRole,
} from '../src/lib/viewRoles.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('dev view switcher covers every stage view', () => {
  it('includes every canonical device role plus the musician preview', () => {
    for (const role of ROLE_ORDER) {
      expect(DEV_VIEW_ROLES, role).toContain(role);
    }
    expect(DEV_VIEW_ROLES).toContain('musician');
    expect(DEV_VIEW_ROLES).toContain('dj_mark');
    expect(DEV_VIEW_ROLES).toContain('dj_szymoniak');
  });

  it('grants the musician and DJ + MC overrides in development', () => {
    const allowed = resolveAllowedViewRoles({
      isProduction: true,
      baseRole: 'mc',
      availableRoles: ROLE_ORDER,
      development: true,
    });
    expect(resolveViewRole({ override: 'musician', allowedRoles: allowed, baseRole: 'mc' })).toBe(
      'musician',
    );
    expect(resolveViewRole({ override: 'dj_mc', allowedRoles: allowed, baseRole: 'mc' })).toBe(
      'dj_mc',
    );
  });

  it('renders localized-free labels for the new roles', () => {
    const html = renderToStaticMarkup(
      createElement(DevViewSwitcher, { currentRole: 'mc', onChange: () => {} }),
    );
    expect(html).toContain('Musician');
    expect(html).toContain('DJ + MC');
    expect(html).toContain('Venue');
    expect(html).toContain('Camera');
  });

  it('has a rendered route for the musician and the DJ + MC mode', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain("if (currentRole === 'musician')");
    expect(deck).toContain('<MusicianView');
    expect(deck).toContain("djMc: currentRole === 'dj_mc'");
    expect(deck.match(/\{devViewSwitcher\}/g)).toHaveLength(7);
  });
});
