import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SyncStatusBadge from '../../src/components/SyncStatusBadge.jsx';
import ChildrenExpectedBadge from '../../src/components/ChildrenExpectedBadge.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #449 simplified pocket header', () => {
  it('ships project-owned sync and baby SVGs', () => {
    expect(read('src/assets/icons/sync.svg')).toContain('stroke="currentColor"');
    expect(read('src/assets/icons/baby.svg')).toContain('stroke="currentColor"');
  });

  it('renders icon-only compact Sync with an accessible label', () => {
    const html = renderToStaticMarkup(
      createElement(SyncStatusBadge, { status: 'connected', compact: true }),
    );
    expect(html).toContain('aria-label="Sync:');
    expect(html).toContain('<svg');
    expect(html).not.toContain('>Sync<');
  });

  it('renders icon-only compact baby with the translated label', () => {
    const html = renderToStaticMarkup(
      createElement(ChildrenExpectedBadge, {
        wedding: { childrenExpected: true },
        role: 'photo1',
        compact: true,
      }),
    );
    expect(html).toContain('aria-label="Children expected"');
    expect(html).toContain('<svg');
    expect(html).not.toContain('>Children expected<');
  });

  it('keeps the compact shell free of logo, clock, PIN and the Sync control', () => {
    const shell = read('src/components/RoleShell.jsx');
    expect(shell).not.toContain('assets/img/logo');
    expect(shell).not.toContain('<TopBarClock');
    expect(shell).not.toContain('PIN {pin}');
    expect(shell).not.toContain('<SyncStatusBadge');
    expect(shell).toContain('resolveSyncState');
    expect(shell).toContain('compact');
  });
});
