import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RoleSwitcher from '../../src/components/RoleSwitcher.jsx';
import { ROLE_ORDER, roleOptionsFor } from '../../src/lib/roles.js';

describe('issue #136 MC Master can switch to all views', () => {
  it('offers every role view to MC Master', () => {
    expect(roleOptionsFor('mc', ROLE_ORDER)).toEqual([
      'mc',
      'dj',
      'photo',
      'speaker',
    ]);
  });

  it('keeps every companion view locked', () => {
    for (const role of ['dj', 'photo', 'speaker']) {
      expect(roleOptionsFor(role, ROLE_ORDER), role).toEqual([]);
    }
  });

  it('renders the MC Master role switcher', () => {
    const html = renderToStaticMarkup(
      createElement(RoleSwitcher, {
        role: 'mc',
        roles: ROLE_ORDER,
        onChange: () => {},
      }),
    );
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('Switch role');
  });
});
