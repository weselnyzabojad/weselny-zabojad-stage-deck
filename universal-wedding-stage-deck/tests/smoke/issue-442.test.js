import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RoleShell from '../../src/components/RoleShell.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #442 compact header disclosure', () => {
  it('keeps only role, utilities and the details disclosure visible', () => {
    const shell = read('src/components/RoleShell.jsx');
    expect(shell).not.toContain("assets/img/logo");
    expect(shell).not.toContain('<TopBarClock');
    expect(shell).not.toContain('PIN {pin}');
    expect(shell).toContain("t('pocket.details')");
    expect(shell).toContain('aria-expanded={detailsOpen}');
    expect(shell).toContain('aria-controls={detailsId}');
  });

  it('puts couple/date, speeches, cultural pills and sync in the disclosure', () => {
    const html = renderToStaticMarkup(
      createElement(
        RoleShell,
        {
          compact: true,
          role: 'mc',
          wedding: { couple: { partner1: 'A', partner2: 'B' } },
          syncStatus: 'connected',
          theme: 'night',
          onToggleTheme: () => {},
          culturalRules: { sto_lat: { status: 'YES' } },
          speechMode: 'SIMPLE',
          speeches: [],
        },
        createElement('div', null, 'content'),
      ),
    );

    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('Details');
    expect(html).toContain('<div id=');
    expect(html).toContain('hidden');
    expect(html).toContain('Sync');
    expect(html).toContain('Sto Lat');
    expect(html).toContain('Speeches');
  });

  it('translates the disclosure label', () => {
    expect(read('src/i18n/en.js')).toContain("'pocket.details': 'Details'");
    expect(read('src/i18n/fr.js')).toContain("'pocket.details':");
    expect(read('src/i18n/pl.js')).toContain("'pocket.details':");
  });

  it('keeps the desktop pass-through', () => {
    const shell = read('src/components/RoleShell.jsx');
    expect(shell).toContain('if (!isCompact)');
    expect(shell).toContain('return <>{children}</>');
  });
});
