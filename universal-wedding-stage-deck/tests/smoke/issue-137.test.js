import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RoleSwitcher from '../../src/components/RoleSwitcher.jsx';

const renderSwitcher = (role) =>
  renderToStaticMarkup(
    createElement(RoleSwitcher, {
      role,
      roles: ['mc', 'dj', 'photo', 'speaker'],
      onChange: () => {},
    }),
  );

describe('issue #137 Speaker role lock', () => {
  it('does not render a role switcher for the Speaker', () => {
    expect(renderSwitcher('speaker')).toBe('');
  });

  it('keeps the role switcher available for MC Master', () => {
    const html = renderSwitcher('mc');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('Switch role');
  });
});
