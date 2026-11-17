import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DjSongRequestQueue from '../src/components/DjSongRequestQueue.jsx';
import { setLocale } from '../src/i18n/index.js';

vi.mock('../src/lib/sync/syncConfig.js', () => ({
  getSyncConfig: () => ({
    enabled: true,
    url: 'https://example.supabase.co',
    anonKey: 'anon',
    table: 'live_sync_state',
    roomPrefix: 'wzsd',
  }),
}));

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

afterEach(() => setLocale('en', { persist: false }));

describe('DJ song-request moderation panel (issue #1161)', () => {
  it('turns the always-visible bar into a summary with a 44 px moderation entry', () => {
    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(
      createElement(DjSongRequestQueue, {
        enabled: true,
        role: 'dj',
        accessToken: 'token',
        roomCode: 'abc123',
      }),
    );

    expect(html).toContain('Modérer');
    expect(html).toContain('0 en attente');
    expect(html).toContain('aria-label="Ouvrir la modération des demandes (0 en attente)"');
    // No inline accept/deny in the bar: actions live inside the closed panel.
    expect(html).not.toContain('aria-label="Accepter');
    expect(html).not.toContain('aria-label="Refuser');
  });

  it('renders the panel only on demand, with tabs, scroll and icon actions', () => {
    const queue = read('src/components/DjSongRequestQueue.jsx');
    expect(queue).toContain('<ModalShell');
    expect(queue).toContain('role="tablist"');
    expect(queue).toContain('role="tab"');
    expect(queue).toContain('role="tabpanel"');
    expect(queue).toContain('aria-selected={selected}');
    expect(queue).toContain('overflow-y-auto overscroll-contain');
    expect(queue).toContain('env(safe-area-inset-bottom)');
    expect(queue).toContain('dj.requests.tabPending');
    expect(queue).toContain('dj.requests.tabAccepted');

    // 44 px icon-only actions with accessible names and ring-only colours.
    expect(queue.match(/h-11 w-11/g)?.length).toBeGreaterThanOrEqual(3);
    expect(queue).toContain('ring-1 ring-emerald-500/50');
    expect(queue).toContain('ring-1 ring-alert/40');
    expect(queue).toContain('dj.requests.acceptAria');
    expect(queue).toContain('dj.requests.denyAria');
    expect(queue).not.toContain('confirm(');
  });

  it('animates a decided card out before moving it', () => {
    const queue = read('src/components/DjSongRequestQueue.jsx');
    expect(queue).toContain('const EXIT_MS = 180');
    expect(queue).toContain('opacity-0 -translate-x-4');
    expect(queue).toContain('motion-reduce:translate-x-0');
    expect(queue).toContain('setLeavingIds');
    expect(queue).toContain('window.clearTimeout');
    expect(queue).toContain('decidingRef');
  });

  it('keeps the real queue transport and removes the dead card variant', () => {
    const queue = read('src/components/DjSongRequestQueue.jsx');
    expect(queue).toContain('subscribeSongRequestChanges');
    expect(queue).toContain('setInterval(load, 30000)');
    expect(queue).toContain('updateSongRequestStatus');
    expect(queue).toContain('markSongRequestPlayed');
    expect(queue).not.toContain('SongRequestQueueList');
    expect(queue).not.toContain('framer-motion');
  });

  it('uses theme tokens instead of hard-coded slate surfaces', () => {
    const queue = read('src/components/DjSongRequestQueue.jsx');
    expect(queue).toContain('border-line bg-card');
    expect(queue).not.toContain('bg-slate-900');
    expect(queue).not.toContain('text-slate-100');
  });

  it('ships the panel keys in all three locales', () => {
    for (const locale of ['pl', 'en', 'fr']) {
      const bundle = read(`src/i18n/${locale}.js`);
      for (const key of [
        'dj.requests.moderate',
        'dj.requests.moderateAria',
        'dj.requests.panelTitle',
        'dj.requests.tabPending',
        'dj.requests.tabAccepted',
        'dj.requests.acceptedCount',
      ]) {
        expect(bundle).toContain(`'${key}'`);
      }
    }
  });
});
