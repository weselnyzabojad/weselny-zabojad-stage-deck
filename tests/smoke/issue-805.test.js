import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isLandingPath } from '../../src/lib/publicRoutes.js';
import { parseDeckIntent } from '../../src/lib/sync/roleSession.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #805 public landing route', () => {
  it('claims only the exact site root', () => {
    expect(isLandingPath('/')).toBe(true);
    expect(isLandingPath('/index.html')).toBe(true);
    expect(isLandingPath('/')).toBe(true);
    expect(isLandingPath('')).toBe(false);
    expect(isLandingPath('/join')).toBe(false);
    expect(isLandingPath('/join/')).toBe(false);
    expect(isLandingPath('/123456/mc')).toBe(false);
    expect(isLandingPath('/admin')).toBe(false);
    expect(isLandingPath('/request/TEST123')).toBe(false);
  });

  it('treats /join as the crew entry, not a room code', () => {
    expect(parseDeckIntent('/join', '')).toEqual({
      roomCode: null,
      role: null,
      requirePin: false,
    });
    expect(parseDeckIntent('/')).toEqual({
      roomCode: null,
      role: null,
      requirePin: false,
    });
  });

  it('keeps role QR links and query intent working', () => {
    expect(parseDeckIntent('/123456/mc', '')).toMatchObject({
      roomCode: '123456',
      role: 'mc',
    });
    expect(parseDeckIntent('/join', '?room=123456&role=dj&phone=true')).toMatchObject({
      roomCode: '123456',
      role: 'dj',
      requirePin: true,
    });
  });

  it('mounts the landing lazily before the app branches', () => {
    const main = read('src/main.jsx');
    expect(main).toContain("lazy(() => import('./components/LandingPage.jsx'))");
    expect(main).toContain('isLandingPath(window.location.pathname)');

    const landingBranch = main.indexOf('IS_LANDING ?');
    const requestBranch = main.indexOf('SONG_REQUEST_ROUTE ? (');
    const adminBranch = main.indexOf('IS_ADMIN ? (');
    const appFallback = main.indexOf('<App />');
    expect(landingBranch).toBeGreaterThan(-1);
    expect(landingBranch).toBeLessThan(requestBranch);
    expect(landingBranch).toBeLessThan(adminBranch);
    expect(appFallback).toBeGreaterThan(adminBranch);
  });

  it('keeps the landing free of wedding, demo and sync imports', () => {
    const landing = read('src/components/LandingPage.jsx');
    expect(landing).not.toContain('@demo');
    expect(landing).not.toContain('demoWedding');
    expect(landing).not.toContain('supabase');
    expect(landing).not.toContain('roleSession');
    expect(landing).not.toContain('cartridge');
    expect(landing).not.toContain('href="/join"');
  });
});
