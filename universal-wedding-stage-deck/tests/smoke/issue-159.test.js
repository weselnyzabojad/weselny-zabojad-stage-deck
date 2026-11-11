import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RoleShell from '../../src/components/RoleShell.jsx';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #159 pocket header', () => {
  const shell = read('src/components/RoleShell.jsx');

  it('keeps role, single-cell language, theme and the always-visible identity', () => {
    expect(shell).not.toContain('<SyncStatusBadge');
    expect(shell).toContain('resolveSyncState');
    expect(shell).toContain('<LanguageToggle');
    expect(shell).toContain('variant="cycle"');
    expect(shell).toContain('<ThemeToggle');
    expect(shell).toContain('<TopBarCenterIdentity');
    expect(shell).not.toContain("t('pocket.details')");
    expect(shell).not.toContain('aria-expanded={detailsOpen}');
    expect(shell).not.toContain('<OpenOnPhoneButton');
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
    expect(html).toContain('aria-label="MC. Sync:');
    expect(html).toContain('>EN<');
    expect(html).not.toContain('>FR<');
    expect(html).not.toContain('>PL<');
    expect(html).toContain('▾');
    expect(html).toContain('<svg');
    expect(html).not.toContain('aria-expanded');
    expect(html).not.toContain('Details');
    expect(html).not.toContain('Open on phone');
    expect(html).not.toContain('Switch role');
    expect(html).not.toContain('Current time');
  });
});
