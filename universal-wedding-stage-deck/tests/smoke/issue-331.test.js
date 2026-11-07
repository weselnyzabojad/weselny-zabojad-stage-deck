import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RoleShell from '../../src/components/RoleShell.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const html = renderToStaticMarkup(
  createElement(
    RoleShell,
    {
      compact: true,
      role: 'dj',
      clock: { nowClock: '21:45' },
      pin: '2048',
      syncStatus: 'connected',
      syncError: null,
      remoteUpdatedAt: null,
      theme: 'night',
      onToggleTheme: () => {},
      culturalRules: { sto_lat: { status: 'YES' } },
      speechMode: 'OFF',
      speeches: [],
    },
    createElement('div', null, 'content'),
  ),
);

describe('issue #331 shared compact mobile top bar', () => {
  it('shows logo, role, clock, PIN, Sync and language in the phone header', () => {
    expect(html).toContain('Weselny');
    expect(html).toContain('DJ');
    expect(html).toContain('21:45');
    expect(html).toContain('PIN 2048');
    expect(html).toContain('Sync');
    expect(html).toContain('aria-label="Language"');
  });

  it('does not duplicate utility controls in the bottom nav', () => {
    const nav = read('src/components/BottomNav.jsx');
    expect(nav).not.toContain('SyncStatusBadge');
    expect(nav).not.toContain('LanguageToggle');
    expect(nav).not.toContain('ThemeToggle');
  });

  it('passes clock and PIN from every role view', () => {
    for (const file of [
      'src/views/McMasterView.jsx',
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/SpeakerView.jsx',
      'src/components/VenueManagerView.jsx',
    ]) {
      const source = read(file);
      expect(source, file).toContain('clock={');
      expect(source, file).toContain('pin={');
    }
  });

  it('keeps the desktop pass-through intact', () => {
    expect(read('src/components/RoleShell.jsx')).toContain('if (!isCompact)');
    expect(read('src/components/RoleShell.jsx')).toContain('return <>{children}</>');
  });
});
