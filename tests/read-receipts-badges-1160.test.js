import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RolePresenceBadge from '../src/components/RolePresenceBadge.jsx';
import RoleReadReceiptsRow from '../src/components/RoleReadReceiptsRow.jsx';
import { setLocale } from '../src/i18n/index.js';
import {
  onlineReceiptGroups,
  PRESENCE_FRESH_MS,
  readReceiptGroups,
} from '../src/lib/readReceipts.js';
import {
  createConfirmationTracker,
  RECEIPT_CONFIRM_MS,
} from '../src/lib/readReceiptConfirmation.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

afterEach(() => {
  vi.useRealTimers();
  setLocale('en', { persist: false });
});

describe('MC read-receipt badges (issue #1160)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setLocale('fr', { persist: false });
  });

  it('confirms a group in green for five seconds, then returns to neutral', () => {
    const changes = [];
    const tracker = createConfirmationTracker({
      onChange: (group, active) => changes.push([group, active]),
    });

    expect(RECEIPT_CONFIRM_MS).toBe(5000);
    tracker.confirm('photo');
    vi.advanceTimersByTime(4999);
    expect(changes).toEqual([['photo', true]]);
    vi.advanceTimersByTime(1);
    expect(changes).toEqual([
      ['photo', true],
      ['photo', false],
    ]);
  });

  it('restarts the same group window and clears every timer', () => {
    const changes = [];
    const tracker = createConfirmationTracker({
      onChange: (group, active) => changes.push([group, active]),
    });

    tracker.confirm('dj');
    vi.advanceTimersByTime(3000);
    tracker.confirm('dj');
    tracker.confirm('venue');
    vi.advanceTimersByTime(4999);
    expect(changes).toEqual([
      ['dj', true],
      ['dj', true],
      ['venue', true],
    ]);

    tracker.clear();
    vi.advanceTimersByTime(10000);
    expect(changes).toEqual([
      ['dj', true],
      ['dj', true],
      ['venue', true],
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('derives read groups from receipts and online groups from fresh presence', () => {
    expect(
      [...readReceiptGroups([{ role: 'photo1' }, { role: 'video' }, { role: 'mc' }])],
    ).toEqual(['photo']);
    expect([...readReceiptGroups([])]).toEqual([]);

    const now = Date.parse('2026-11-17T20:00:00Z');
    const fresh = new Date(now - 30000).toISOString();
    const stale = new Date(now - PRESENCE_FRESH_MS - 1000).toISOString();
    const groups = onlineReceiptGroups(
      [
        { role: 'dj_mc', status: 'online', last_seen: fresh },
        { role: 'photo2', status: 'online', last_seen: stale },
        { role: 'musician', status: 'idle', last_seen: fresh },
        { role: 'venue_manager', status: 'online', last_seen: fresh },
      ],
      { now },
    );
    expect([...groups].sort()).toEqual(['dj', 'venue']);
  });

  it('renders the unread, confirmed and online states without colour-only meaning', () => {
    const unread = renderToStaticMarkup(
      createElement(RolePresenceBadge, {
        roleName: 'DJ',
        hasUnreadUpdate: true,
        isOnline: true,
      }),
    );
    expect(unread).toContain('ring-amber-500/70');
    expect(unread).toContain('animate-pulse');
    expect(unread).toContain('non lu');
    expect(unread).toContain('en ligne');
    expect(unread).toContain('aria-label="DJ : non lu, en ligne"');

    const confirmed = renderToStaticMarkup(
      createElement(RolePresenceBadge, {
        roleName: 'DJ',
        hasUnreadUpdate: true,
        justConfirmed: true,
        isOnline: false,
      }),
    );
    expect(confirmed).toContain('border-emerald-500/60');
    expect(confirmed).toContain('lu');
    expect(confirmed).toContain('hors ligne');
    expect(confirmed).not.toContain('animate-pulse');

    const idle = renderToStaticMarkup(
      createElement(RolePresenceBadge, { roleName: 'DJ' }),
    );
    expect(idle).toContain('border-line bg-raised/60 text-muted');
    expect(idle).toContain('à jour');
    expect(idle).not.toContain('ring-amber-500/70');
  });

  it('renders the four role badges only when a revision exists', () => {
    expect(renderToStaticMarkup(createElement(RoleReadReceiptsRow, {}))).toBe('');

    const html = renderToStaticMarkup(
      createElement(RoleReadReceiptsRow, {
        target: {
          stepId: 'step-first-dance',
          revision: '2026-11-17T20:00:00.000Z',
          stepTitle: 'Première danse',
        },
      }),
    );
    expect(html).toContain('Accusés de lecture');
    expect(html).toContain('Dernière mise à jour : Première danse');
    for (const label of ['DJ', 'Musicien', 'Photo', 'Salle']) {
      expect(html).toContain(`>${label}<`);
    }
    // No client: neutral, never a false unread state.
    expect(html).not.toContain('non lu');
  });

  it('wires the row into both MC layouts and the MC model only', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain("import RoleReadReceiptsRow from '../components/RoleReadReceiptsRow'");
    expect(mc.match(/currentFooter=\{<RoleReadReceiptsRow/g)).toHaveLength(2);
    expect(mc).toContain('receiptTarget = null');
    expect(mc).toContain('receiptClient = null');

    const stage = read('src/StageDeck.jsx');
    expect(stage).toMatch(/receiptTarget,\r?\n\s+receiptClient,/);
    expect(read('src/components/DjBoothView.jsx')).not.toContain('RoleReadReceiptsRow');

    const row = read('src/components/RoleReadReceiptsRow.jsx');
    expect(row).toContain('subscribeStepReceipts');
    expect(row).toContain('fetchRolePresence');
    expect(row).toContain('PRESENCE_REFRESH_MS');
    expect(row).toContain('visibilitychange');
  });

  it('ships the new keys in all three locales', () => {
    for (const locale of ['pl', 'en', 'fr']) {
      const bundle = read(`src/i18n/${locale}.js`);
      for (const key of [
        'mc.readReceipts.title',
        'mc.readReceipts.lastUpdate',
        'mc.readReceipts.badgeAria',
        'mc.readReceipts.state.unread',
        'mc.readReceipts.role.photo',
      ]) {
        expect(bundle).toContain(`'${key}'`);
      }
    }
  });
});
