import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeRoleSession } from '../src/lib/sync/roleSession.js';
import { normalizeRole, ROLES } from '../src/lib/roles.js';
import { parseDeckIntent } from '../src/lib/sync/roleSession.js';
import { buildMusicianLink } from '../src/admin/adminUtils.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #992 musician role, join access and view', () => {
  it('adds musician as a joinable canonical role with labels', () => {
    expect(ROLES.musician).toMatchObject({ id: 'musician', joinable: true, view: 'musician' });
    expect(normalizeRole('musician')).toBe('musician');
    for (const locale of ['en', 'fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      expect(dict).toContain("'role.musician.label'");
      expect(dict).toContain("'musician.availability'");
    }
  });

  it('carries the musician id through the deep link and role session', () => {
    const intent = parseDeckIntent('/abc123/musician', '?musician=anna');
    expect(intent).toMatchObject({ roomCode: 'abc123', role: 'musician', musicianId: 'anna' });

    const session = normalizeRoleSession({
      token: 'token',
      weddingId: 'A&B-UM-2026-08-001',
      role: 'musician',
      expiresAt: Date.now() + 60_000,
      musicianId: 'anna',
    });
    expect(session.musicianId).toBe('anna');
    expect(buildMusicianLink('https://deck.example', 'abc123', 'anna')).toBe(
      'https://deck.example/abc123/musician?musician=anna',
    );
  });

  it('validates per-musician access in join_room without leaking data', () => {
    const join = read('supabase/functions/join_room/index.ts');
    expect(join).toContain("'musician'");
    expect(join).toContain('wedding_musician_access');
    expect(join).toContain("role === 'musician' && !musicianId");
    expect(join).toContain("from('wedding_musicians')");
    expect(join).toContain('musician_id: musicianId');
    expect(join).toContain('musician_id: musicianId }');
  });

  it('creates access rows, revokes sessions and snapshots independent of the DJ registry', () => {
    const migration = read('supabase/migrations/202611150003_musician_role.sql');
    expect(migration).toContain("'musician'");
    expect(migration).toContain('create table if not exists public.wedding_musician_access');
    expect(migration).toContain('musician_id uuid primary key');
    expect(migration).toContain('revoke all on public.wedding_musician_access from anon, authenticated');
    expect(migration).toContain("cartridge - 'speeches'");

    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain('ensureMusicianAccess');
    expect(api).toContain('revokeMusicianAccess');
    expect(api).toContain("'musician_deactivate'");
    expect(api).toContain("'musician_delete'");
    expect(api).toContain(".eq('musician_id', musicianId)");
  });

  it('renders a read-only musician view with personal availability and end hours', () => {
    const view = read('src/components/MusicianView.jsx');
    expect(view).toContain('<TimelineFocusStack');
    expect(view).toContain('<EndHoursCard');
    expect(view).toContain("t('musician.availability')");
    expect(view).toContain("role=\"musician\"");
    expect(view).not.toContain('HoldToConfirmButton');
    expect(view).not.toContain('markCurrentDone');
    expect(view).not.toContain('TeleprompterOverlay');

    const stage = read('src/StageDeck.jsx');
    expect(stage).toContain("currentRole === 'musician'");
    expect(stage).toContain('<MusicianView');
    expect(stage).toContain('roleSession?.musicianId ?? deckIntent.musicianId');
  });

  it('offers one QR entry per active musician in the admin panel', () => {
    const panel = read('src/admin/AdminMusicians.jsx');
    expect(panel).toContain('buildMusicianLink');
    expect(panel).toContain('<AdminQrCards');
    expect(panel).toContain('Musician QR');
    const utils = read('src/admin/adminUtils.js');
    expect(utils).toContain('export function buildMusicianLink');
  });
});
