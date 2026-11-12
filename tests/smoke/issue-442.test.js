import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RoleShell from '../../src/components/RoleShell.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const wedding = {
  dateISO: '2026-11-09',
  coupleProfile: {
    bride: { firstName: 'Jennifer', nationalities: ['FR'] },
    groom: { firstName: 'Guillaume', nationalities: ['PL'] },
    commonLanguages: ['FR', 'PL'],
  },
};

describe('issue #442 compact header disclosure removal', () => {
  it('keeps only role and utilities in the fixed row', () => {
    const shell = read('src/components/RoleShell.jsx');
    expect(shell).not.toContain("assets/img/logo");
    expect(shell).not.toContain('<TopBarClock');
    expect(shell).not.toContain('PIN {pin}');
    expect(shell).not.toContain("t('pocket.details')");
    expect(shell).not.toContain('aria-expanded');
    expect(shell).not.toContain('aria-controls');
  });

  it('shows couple, languages, cultural pills and speeches without a disclosure', () => {
    const html = renderToStaticMarkup(
      createElement(
        RoleShell,
        {
          compact: true,
          role: 'mc',
          wedding,
          syncStatus: 'connected',
          theme: 'night',
          onToggleTheme: () => {},
          culturalRules: { sto_lat: { status: 'YES' } },
          speechMode: 'COMPLEX',
          speeches: [{ id: 'speech_a', speaker: { name: 'Anna' } }],
        },
        createElement('div', null, 'content'),
      ),
    );

    expect(html).not.toContain('aria-expanded');
    expect(html).not.toContain('Details');
    expect(html).not.toContain('hidden=""');
    expect(html).toContain('Jennifer');
    expect(html).toContain('Guillaume');
    expect(html).toContain('Sto Lat');
    expect(html).toContain('Speeches');
    expect(html).toContain('aria-label="MC. Sync:');
  });

  it('removes the disclosure label from the dictionary', () => {
    expect(read('src/i18n/en.js')).not.toContain("'pocket.details'");
    expect(read('src/i18n/fr.js')).not.toContain("'pocket.details'");
    expect(read('src/i18n/pl.js')).not.toContain("'pocket.details'");
  });

  it('keeps the desktop pass-through', () => {
    const shell = read('src/components/RoleShell.jsx');
    expect(shell).toContain('if (!isCompact)');
    expect(shell).toContain('return <>{children}</>');
  });
});
