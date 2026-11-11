import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SyncStatusBadge from '../../src/components/SyncStatusBadge.jsx';
import ThemeToggle from '../../src/components/ThemeToggle.jsx';
import TopBarClock from '../../src/components/TopBarClock.jsx';
import TopBarRoleLabel from '../../src/components/TopBarRoleLabel.jsx';

const clock = {
  nowClock: '18:42:07',
  projectedFinish: '23:30',
  active: { elapsedSec: 1200, title: 'Dinner' },
  djCutoff: { label: '20:15', inSec: 300 },
};

describe('issue #155 shared top-bar controls', () => {
  it('renders only the current time in the top-bar clock', () => {
    const html = renderToStaticMarkup(createElement(TopBarClock, { clock }));
    expect(html).toContain('18:42:07');
    expect(html).not.toContain('23:30');
    expect(html).not.toContain('Dinner');
    expect(html).not.toContain('20:15');
  });

  it('labels MC and DJ service tiers', () => {
    expect(
      renderToStaticMarkup(createElement(TopBarRoleLabel, { role: 'mc' })),
    ).toContain('MC Master');
    expect(
      renderToStaticMarkup(
        createElement(TopBarRoleLabel, { role: 'dj', tier: 'VIP' }),
      ),
    ).toContain('DJ VIP');
    expect(
      renderToStaticMarkup(
        createElement(TopBarRoleLabel, { role: 'dj', tier: 'STANDARD' }),
      ),
    ).toContain('DJ');
    expect(
      renderToStaticMarkup(
        createElement(TopBarRoleLabel, { role: 'dj', tier: 'STANDARD' }),
      ),
    ).not.toContain('DJ Standard');
  });

  it('shows only Sync text with the approved status dot mapping', () => {
    const connected = renderToStaticMarkup(
      createElement(SyncStatusBadge, { status: 'connected' }),
    );
    expect(connected).toContain('>Sync<');
    expect(connected).toContain('bg-emerald-500');
    expect(connected).not.toContain('>Cloud synced<');

    const connecting = renderToStaticMarkup(
      createElement(SyncStatusBadge, { status: 'connecting' }),
    );
    expect(connecting).toContain('bg-amber-500');

    const offline = renderToStaticMarkup(
      createElement(SyncStatusBadge, { status: 'offline' }),
    );
    expect(offline).toContain('bg-red-600');

    const pending = renderToStaticMarkup(
      createElement(SyncStatusBadge, {
        status: 'offline',
        outbox: { attempts: 2, nextAttemptAt: null, lastError: null },
      }),
    );
    expect(pending).toContain('bg-amber-500');
    expect(pending).toContain('Sync: Pending sync');
  });

  it('keeps detailed sync information in tooltip/accessibility', () => {
    const html = renderToStaticMarkup(
      createElement(SyncStatusBadge, { status: 'error', error: 'Network down' }),
    );
    expect(html).toContain('title="Cloud sync: Network down"');
    expect(html).toContain('aria-label="Sync: Sync error"');
  });

  it('renders the theme toggle as an icon with no visible label', () => {
    const night = renderToStaticMarkup(createElement(ThemeToggle, { theme: 'night' }));
    expect(night).toContain('<svg');
    expect(night).toContain('aria-label=');
    expect(night).not.toContain('>Night<');

    const day = renderToStaticMarkup(createElement(ThemeToggle, { theme: 'day' }));
    expect(day).toContain('<svg');
    expect(day).not.toContain('>Day<');
  });
});
