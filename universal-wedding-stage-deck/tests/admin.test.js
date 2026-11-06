import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminConfirmDialog, AdminMfaDialog } from '../src/admin/AdminDialogs.jsx';
import AdminToast from '../src/admin/AdminToast.jsx';
import {
  ADMIN_ABSOLUTE_MS,
  ADMIN_IDLE_MS,
  ADMIN_WARNING_MS,
  buildQrCards,
  buildRoleLink,
  createAdminSession,
  filterWeddings,
  getAdminSessionState,
  hasFreshMfa,
  isAdminPath,
  shouldWarnAdminSession,
  presenceStatus,
  summarizeWedding,
  touchAdminSession,
  validateRoles,
  validateRoomCode,
  validateWeddingId,
} from '../src/admin/adminUtils.js';

describe('issue #76 owner admin panel', () => {
  it('only activates on the /deck/admin route', () => {
    expect(isAdminPath('/deck/admin')).toBe(true);
    expect(isAdminPath('/deck/admin/')).toBe(true);
    expect(isAdminPath('/deck')).toBe(false);
    expect(isAdminPath('/deck/room/mc')).toBe(false);
    expect(isAdminPath('/admin')).toBe(false);
  });

  it('enforces a 30-minute idle and 8-hour absolute admin session', () => {
    const started = 1_000_000;
    const session = createAdminSession(started);

    expect(getAdminSessionState({ session, now: started + 1000 }).expired).toBe(false);

    expect(
      getAdminSessionState({ session, now: started + ADMIN_IDLE_MS + 1 }),
    ).toMatchObject({ expired: true, reason: 'idle' });

    const active = touchAdminSession(session, started + ADMIN_IDLE_MS);
    expect(
      getAdminSessionState({ session: active, now: started + ADMIN_ABSOLUTE_MS + 1 }),
    ).toMatchObject({ expired: true, reason: 'absolute' });

    expect(
      shouldWarnAdminSession({ session, now: started + ADMIN_IDLE_MS - ADMIN_WARNING_MS + 1 }),
    ).toBe(true);
    expect(
      shouldWarnAdminSession({ session, now: started + ADMIN_IDLE_MS - ADMIN_WARNING_MS - 1 }),
    ).toBe(false);
  });

  it('requires aal2 and a recent TOTP re-auth for destructive actions', () => {
    const now = 1_000_000_000;
    const claims = { aal: 'aal2', amr: [{ method: 'totp', timestamp: now / 1000 - 60 }] };
    expect(hasFreshMfa(claims, now)).toBe(true);
    expect(hasFreshMfa({ ...claims, aal: 'aal1' }, now)).toBe(false);
    expect(
      hasFreshMfa({ aal: 'aal2', amr: [{ method: 'totp', timestamp: now / 1000 - 600 }] }, now),
    ).toBe(false);
  });

  it('derives online / idle / offline presence from the last heartbeat', () => {
    const now = Date.parse('2026-11-06T12:00:00Z');
    expect(presenceStatus({ lastSeen: new Date(now - 30_000).toISOString(), now })).toBe('online');
    expect(presenceStatus({ lastSeen: new Date(now - 2 * 60_000).toISOString(), now })).toBe('online');
    expect(presenceStatus({ lastSeen: new Date(now - 2 * 60_000 - 1).toISOString(), now })).toBe('idle');
    expect(presenceStatus({ lastSeen: new Date(now - 5 * 60_000).toISOString(), now })).toBe('idle');
    expect(presenceStatus({ lastSeen: new Date(now - 10 * 60_000).toISOString(), now })).toBe('idle');
    expect(presenceStatus({ lastSeen: new Date(now - 10 * 60_000 - 1).toISOString(), now })).toBe('offline');
    expect(presenceStatus({ lastSeen: new Date(now - 30 * 60_000).toISOString(), now })).toBe('offline');
    expect(
      presenceStatus({
        lastSeen: new Date(now).toISOString(),
        tokenExpiresAt: new Date(now - 1).toISOString(),
        now,
      }),
    ).toBe('offline');
  });

  it('builds printable role QR cards without ever including a PIN', () => {
    const cards = buildQrCards({
      baseUrl: 'https://weselnyzabojad.pl/deck',
      roomCode: '8f3k2q',
      wedding: { weddingId: '2026-08-20_jennifer_guillaume', couple: 'Jennifer & Guillaume', date: '20.08.2026' },
      roles: ['mc', 'dj', 'bogus', 'mc'],
      labels: { mc: 'MC Master', dj: 'DJ Booth' },
    });

    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({
      role: 'mc',
      label: 'MC Master',
      url: 'https://weselnyzabojad.pl/deck/8f3k2q/mc',
      roomCode: '8f3k2q',
    });
    for (const card of cards) {
      expect(JSON.stringify(card)).not.toMatch(/\bpin\b|123456/i);
    }
    expect(buildRoleLink('https://example.com/deck/', 'abc123', 'photo')).toBe(
      'https://example.com/deck/abc123/photo',
    );
  });

  it('validates ids, room codes and roles', () => {
    expect(validateWeddingId('2026-08-20_jennifer_guillaume')).toBe(true);
    expect(validateWeddingId('jennifer')).toBe(false);
    expect(validateRoomCode('8f3k2q')).toBe(true);
    expect(validateRoomCode('NO SPACES')).toBe(false);
    expect(validateRoles(['mc', 'dj', 'mc', 'bogus'])).toEqual(['mc', 'dj']);
  });

  it('renders accessible admin dialogs without native prompts', () => {
    const mfa = renderToStaticMarkup(
      createElement(AdminMfaDialog, {
        open: true,
        onVerified: () => {},
        onCancel: () => {},
      }),
    );
    expect(mfa).toContain('6-digit code');
    expect(mfa).toContain('Verify');
    expect(mfa).toContain('role="dialog"');

    const confirm = renderToStaticMarkup(
      createElement(AdminConfirmDialog, {
        open: true,
        title: 'Delete wedding',
        requireText: '2026-08-20_x',
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    expect(confirm).toContain('Delete wedding');
    expect(confirm).toContain('2026-08-20_x');
  });

  it('filters the wedding library by query, archive state and role', () => {
    const rows = [
      { wedding_id: '2026-08-20_jennifer_guillaume', couple: 'Jennifer & Guillaume', room_code: '8f3k2q', roles: ['mc', 'dj'] },
      { wedding_id: '2026-09-12_anna_tomek', couple: 'Anna & Tomek', room_code: 'abc123', roles: ['mc', 'photo'], archived_at: '2026-10-01T00:00:00Z' },
    ];
    expect(filterWeddings(rows)).toHaveLength(1);
    expect(filterWeddings(rows, { status: 'all' })).toHaveLength(2);
    expect(filterWeddings(rows, { status: 'archived' })).toHaveLength(1);
    expect(filterWeddings(rows, { query: 'guillaume' })[0].room_code).toBe('8f3k2q');
    expect(filterWeddings(rows, { query: 'ABC123', status: 'all' })[0].couple).toBe('Anna & Tomek');
    expect(filterWeddings(rows, { status: 'all', role: 'photo' })).toHaveLength(1);
    expect(filterWeddings(rows, { status: 'all', role: 'dj' })).toHaveLength(1);
  });

  it('renders admin success and error toasts with live roles', () => {
    const success = renderToStaticMarkup(
      createElement(AdminToast, {
        toasts: [{ id: 1, tone: 'success', message: 'Wedding archived.' }],
        onDismiss: () => {},
      }),
    );
    expect(success).toContain('Wedding archived.');
    expect(success).toContain('role="status"');

    const error = renderToStaticMarkup(
      createElement(AdminToast, {
        toasts: [{ id: 2, tone: 'error', message: 'Request failed.' }],
        onDismiss: () => {},
      }),
    );
    expect(error).toContain('role="alert"');
  });

  it('normalizes a wedding row for the admin list', () => {
    expect(
      summarizeWedding({
        wedding_id: '2026-08-20_x',
        room_code: '8f3k2q',
        couple: 'X & Y',
        date: '20.08.2026',
        roles: ['mc', 'dj', 'bogus'],
        archived_at: '2026-11-01T00:00:00Z',
      }),
    ).toMatchObject({
      weddingId: '2026-08-20_x',
      roomCode: '8f3k2q',
      roles: ['mc', 'dj'],
      archived: true,
    });
  });
});
