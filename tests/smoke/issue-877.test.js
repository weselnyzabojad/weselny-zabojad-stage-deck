import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROLE_IDS, buildQrCards } from '../../src/admin/adminUtils.js';
import {
  JOINABLE_ROLE_IDS,
  MEDIA_ROLE_IDS,
  ROLES,
  ROLE_ORDER,
  normalizeRole,
} from '../../src/lib/roles.js';
import { parseDeckIntent } from '../../src/lib/sync/roleSession.js';
import { buildOpenOnPhoneUrl, canOpenOnPhone } from '../../src/lib/openOnPhone.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');
const CANONICAL = ['mc', 'dj', 'photo1', 'photo2', 'video', 'venue_manager', 'speaker'];

describe('issue #877 unified role catalog and join flow', () => {
  it('exposes one catalog with view, provider category and joinability', () => {
    expect(ROLE_ORDER).toEqual(CANONICAL);
    expect(ROLE_IDS).toEqual(CANONICAL);
    expect(JOINABLE_ROLE_IDS).toEqual(CANONICAL);
    for (const id of CANONICAL) {
      expect(ROLES[id]).toMatchObject({ id, joinable: true });
      expect(typeof ROLES[id].view).toBe('string');
      expect(typeof ROLES[id].providerCategory).toBe('string');
    }
    for (const id of MEDIA_ROLE_IDS) expect(ROLES[id].view).toBe('photo');
  });

  it('derives the join selector from the catalog instead of a hardcoded list', () => {
    const join = read('src/components/RoleJoinScreen.jsx');
    expect(join).toContain('JOINABLE_ROLE_IDS');
    expect(join).toContain('const JOIN_ROLES = JOINABLE_ROLE_IDS;');
    expect(join).not.toMatch(/const JOIN_ROLES = \[/);
  });

  it('preserves every deep-linked role before join', () => {
    for (const role of CANONICAL) {
      expect(parseDeckIntent(`/abc123/${role}`, '')).toMatchObject({
        roomCode: 'abc123',
        role,
      });
    }
    expect(parseDeckIntent('/abc123/photo', '')).toMatchObject({ role: 'photo1' });
  });

  it('allows Open on phone for every joinable role and keeps the DJ VIP gate', () => {
    for (const role of CANONICAL) {
      expect(canOpenOnPhone({ role, tier: 'VIP' })).toBe(true);
    }
    expect(canOpenOnPhone({ role: 'dj', tier: 'STANDARD' })).toBe(false);
    expect(canOpenOnPhone({ role: 'photo' })).toBe(true);
    expect(canOpenOnPhone({ role: 'bogus' })).toBe(false);

    for (const role of CANONICAL) {
      const url = buildOpenOnPhoneUrl({ roomCode: 'abc123', role });
      expect(url).toContain(`/abc123/${role}?phone=true`);
    }
    expect(buildOpenOnPhoneUrl({ roomCode: 'abc123', role: 'photo' })).toContain(
      '/abc123/photo1?phone=true',
    );
  });

  it('generates QR cards for all canonical roles', () => {
    const cards = buildQrCards({
      baseUrl: 'https://deck.weselnyzabojad.pl',
      roomCode: 'abc123',
      roles: CANONICAL,
    });
    expect(cards.map((card) => card.role).sort()).toEqual([...CANONICAL].sort());
    for (const role of CANONICAL) {
      expect(cards.find((card) => card.role === role).url).toContain(`/abc123/${role}`);
    }
  });

  it('normalizes legacy photo values centrally', () => {
    expect(normalizeRole('photo')).toBe('photo1');
    expect(ROLES.photo).toBeUndefined();
  });
});
