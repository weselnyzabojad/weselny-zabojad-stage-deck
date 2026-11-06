import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RoleShell from '../../src/components/RoleShell.jsx';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #159 pocket header', () => {
  const shell = read('src/components/RoleShell.jsx');

  it('contains only role, Sync, language and theme in the header', () => {
    expect(shell).toContain('<SyncStatusBadge');
    expect(shell).toContain('<LanguageToggle');
    expect(shell).toContain('<ThemeToggle');
    expect(shell).not.toContain('<TopBarClock');
    expect(shell).not.toContain('<OpenOnPhoneButton');
    expect(shell).not.toContain('<RoleSwitcher');
    expect(shell).not.toContain('RoleSwitcher');
  });

  it('renders the approved pocket controls without desktop-only actions', () => {
    const html = renderToStaticMarkup(
      createElement(
        RoleShell,
        {
          compact: true,
          role: 'mc',
          syncStatus: 'connected',
          theme: 'night',
          onToggleTheme: () => {},
        },
        createElement('div', null, 'Pocket content'),
      ),
    );

    expect(html).toContain('MC');
    expect(html).toContain('>Sync<');
    expect(html).toContain('>EN<');
    expect(html).toContain('>FR<');
    expect(html).toContain('>PL<');
    expect(html).toContain('<svg');
    expect(html).not.toContain('Open on phone');
    expect(html).not.toContain('Switch role');
    expect(html).not.toContain('Current time');
  });
});
