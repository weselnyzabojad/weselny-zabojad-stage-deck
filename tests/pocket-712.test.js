import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RoleShell from '../src/components/RoleShell.jsx';

const renderShell = ({ role = 'mc', syncStatus = 'connected', outbox = null } = {}) =>
  renderToStaticMarkup(
    createElement(
      RoleShell,
      {
        compact: true,
        role,
        syncStatus,
        outbox,
        theme: 'night',
        onToggleTheme: () => {},
      },
      createElement('div', null, 'Pocket content'),
    ),
  );

describe('issue #712 pocket role badge red/green only', () => {
  it('renders green only when sync is connected', () => {
    const html = renderShell({ syncStatus: 'connected' });
    expect(html).toContain('bg-tone-positive-bg');
    expect(html).toContain('border-tone-positive-border');
    expect(html).not.toContain('bg-tone-warning-bg');
  });

  it('renders red for every unconfirmed state', () => {
    for (const [label, props] of [
      ['connecting', { syncStatus: 'connecting' }],
      ['pending outbox', {
        syncStatus: 'connected',
        outbox: { attempts: 1, nextAttemptAt: null, lastError: null },
      }],
      ['disabled', { syncStatus: 'disabled' }],
      ['offline', { syncStatus: 'offline' }],
      ['disconnected', { syncStatus: 'disconnected' }],
      ['error', { syncStatus: 'error' }],
    ]) {
      const html = renderShell(props);
      expect(html, label).toContain('bg-tone-negative-bg');
      expect(html, label).toContain('border-tone-negative-border');
      expect(html, label).not.toContain('bg-tone-warning-bg');
    }
  });

  it('applies the same mapping to every pocket role badge', () => {
    for (const role of ['mc', 'dj', 'photo1', 'photo2', 'video', 'speaker', 'venue_manager']) {
      const connected = renderShell({ role, syncStatus: 'connected' });
      expect(connected, role).toContain('bg-tone-positive-bg');

      const connecting = renderShell({ role, syncStatus: 'connecting' });
      expect(connecting, role).toContain('bg-tone-negative-bg');
      expect(connecting, role).not.toContain('bg-tone-warning-bg');
    }
  });

  it('keeps the role text, sync tooltip and status semantics unchanged', () => {
    const html = renderShell({ syncStatus: 'connecting' });
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-label="MC. Sync: Connecting');
    expect(html).toContain('title="Cloud sync status"');
    expect(html).toContain('>MC</span>');
  });
});
