import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ViewSwitchControl from '../../src/components/ViewSwitchControl.jsx';
import {
  resolveAllowedViewRoles,
  resolveBaseRole,
  resolveViewRole,
} from '../../src/lib/viewRoles.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #210 MC to DJ view-only switch', () => {
  it('allows MC to render DJ only when the package includes a DJ', () => {
    const allowed = resolveAllowedViewRoles({
      isProduction: true,
      baseRole: 'mc',
      availableRoles: ['mc', 'dj', 'photo', 'speaker'],
    });
    expect(allowed).toEqual(['mc', 'dj']);
    expect(resolveViewRole({ override: 'dj', allowedRoles: allowed, baseRole: 'mc' })).toBe('dj');
    expect(resolveViewRole({ override: 'photo', allowedRoles: allowed, baseRole: 'mc' })).toBe('mc');
  });

  it('does not offer DJ view for HOST_ONLY or non-MC authenticated roles', () => {
    expect(
      resolveAllowedViewRoles({
        isProduction: true,
        baseRole: 'mc',
        availableRoles: ['mc', 'photo', 'speaker'],
      }),
    ).toEqual(['mc']);
    expect(
      resolveAllowedViewRoles({
        isProduction: true,
        baseRole: 'dj',
        availableRoles: ['mc', 'dj', 'photo', 'speaker'],
      }),
    ).toEqual(['dj']);
  });

  it('resolves the authenticated production role from the session', () => {
    expect(
      resolveBaseRole({
        isProduction: true,
        roleSessionRole: 'mc',
        role: 'photo',
        availableRoles: ['mc', 'dj'],
      }),
    ).toBe('mc');
  });

  it('renders the DJ-view and return controls localized with the tier', () => {
    const enter = renderToStaticMarkup(
      createElement(ViewSwitchControl, { mode: 'enter', tier: 'VIP', onClick: () => {} }),
    );
    expect(enter).toContain('DJ view');
    expect(enter).toContain('VIP');

    const back = renderToStaticMarkup(
      createElement(ViewSwitchControl, { mode: 'return', onClick: () => {} }),
    );
    expect(back).toContain('Return to MC');
  });

  it('wires the view switch into MC and DJ views without a role switcher', () => {
    const deck = read('src/StageDeck.jsx');
    const mc = read('src/views/McMasterView.jsx');
    const dj = read('src/components/DjBoothView.jsx');
    expect(deck).toContain('<ViewSwitchControl');
    expect(deck).toContain('viewSwitch: currentRole === \'mc\' ? viewSwitch : null');
    expect(mc).toContain('{viewSwitch}');
    expect(dj).toContain('viewSwitch = null');
    expect(dj).toContain('{viewSwitch}');
    expect(mc).not.toContain('RoleSwitcher');
  });
});
