import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  activeMusiciansForSnapshot,
  normalizeMusicianPayload,
  withMusicianSnapshot,
} from '../supabase/functions/_shared/musicians.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const row = (overrides = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Anna',
  instrument: 'violin',
  start_time: '15:00',
  end_time: '21:00',
  ceremony_required: true,
  notes: 'Ceremony and dinner.',
  active: true,
  ...overrides,
});

describe('issue #990 musician registry', () => {
  it('normalizes a valid musician including cross-midnight availability', () => {
    const result = normalizeMusicianPayload({
      name: ' Anna ',
      instrument: ' violin ',
      startTime: '22:00',
      endTime: '01:00',
      ceremonyRequired: true,
      notes: ' Late set. ',
    });
    expect(result.error).toBeUndefined();
    expect(result.musician).toMatchObject({
      name: 'Anna',
      instrument: 'violin',
      start_time: '22:00',
      end_time: '01:00',
      ceremony_required: true,
      notes: 'Late set.',
      active: true,
    });
  });

  it('rejects invalid clocks, equal clocks, half windows and long notes', () => {
    expect(normalizeMusicianPayload({ name: 'A', instrument: 'violin', startTime: '25:00', endTime: '01:00' }).error).toBeTruthy();
    expect(normalizeMusicianPayload({ name: 'A', instrument: 'violin', startTime: '15:00', endTime: '15:00' }).error).toBeTruthy();
    expect(normalizeMusicianPayload({ name: 'A', instrument: 'violin', startTime: '15:00' }).error).toBeTruthy();
    expect(normalizeMusicianPayload({ name: 'A', instrument: 'violin', notes: 'x'.repeat(501) }).error).toBeTruthy();
    expect(normalizeMusicianPayload({ name: 'A', instrument: '' }).error).toBeTruthy();
  });

  it('snapshots only active musicians and preserves the Doc expected flag', () => {
    const cartridge = { musicians: { expected: true, items: [{ id: 'old' }] } };
    const rows = [row(), row({ id: 'inactive', name: 'Piotr', active: false })];
    expect(activeMusiciansForSnapshot(rows)).toHaveLength(1);
    expect(withMusicianSnapshot(cartridge, rows)).toMatchObject({
      musicians: {
        expected: true,
        items: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Anna',
            instrument: 'violin',
            startTime: '15:00',
            endTime: '21:00',
            ceremonyRequired: true,
            notes: 'Ceremony and dinner.',
            active: true,
          },
        ],
      },
    });
  });

  it('keeps an empty roster valid when the Doc does not expect a musician', () => {
    expect(withMusicianSnapshot({}, [])).toEqual({
      musicians: { expected: false, items: [] },
    });
  });

  it('wires the migration, API actions, publish snapshot, client and admin UI', () => {
    const migration = read('supabase/migrations/202611150002_wedding_musicians.sql');
    expect(migration).toContain('create table if not exists public.wedding_musicians');
    expect(migration).toContain('references public.weddings(wedding_id) on delete cascade');
    expect(migration).toContain('enable row level security');
    expect(migration).toContain('revoke all on public.wedding_musicians from anon, authenticated');
    expect(migration).toContain('wedding_musicians_wedding_idx');

    const api = read('supabase/functions/admin_api/index.ts');
    for (const action of ['list_musicians', 'upsert_musician', 'deactivate_musician', 'delete_musician']) {
      expect(api).toContain(`action === '${action}'`);
    }
    expect(api).toContain('withMusicianSnapshot');
    expect(api).toContain("'musician_upsert'");
    expect(api).toContain("'musician_deactivate'");
    expect(api).toContain("'musician_delete'");
    expect(api).toContain('requireWritableWedding(admin, weddingId)');

    const client = read('src/admin/adminApi.js');
    for (const fn of ['listMusicians', 'upsertMusician', 'deactivateMusician', 'deleteMusician']) {
      expect(client).toContain(`export async function ${fn}`);
    }

    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain("import AdminMusicians from './AdminMusicians'");
    expect(app).toContain('<AdminMusicians');

    const panel = read('src/admin/AdminMusicians.jsx');
    expect(panel).toContain('Doc expects a musician');
    expect(panel).toContain('No musician expected in Doc');
    expect(panel).toContain('Ceremony required');
    expect(panel).toContain('Delete musician');
  });
});
