import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SERVICE_PACKAGES, isServicePackage } from '../src/lib/servicePackage.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1309 Venue Manager service package correction', () => {
  const migration = read('supabase/migrations/202611200001_venue_service_package_correction.sql');
  const client = read('src/lib/sync/supabaseSyncClient.js');
  const view = read('src/components/VenueManagerView.jsx');
  const deck = read('src/StageDeck.jsx');

  it('exposes the three allowed packages and rejects everything else', () => {
    expect(SERVICE_PACKAGES).toEqual(['HOST_ONLY', 'DJ_MC', 'HOST_AND_DJ_VIP']);
    for (const value of SERVICE_PACKAGES) expect(isServicePackage(value)).toBe(true);
    expect(isServicePackage('HOST_AND_DJ')).toBe(false);
    expect(isServicePackage('')).toBe(false);
    expect(isServicePackage(null)).toBe(false);
  });

  it('authorizes only an active Venue Manager session for the same wedding', () => {
    expect(migration).toContain("app_role <> 'venue_manager'");
    expect(migration).toContain("s.wedding_id = wid");
    expect(migration).toContain('s.revoked_at is null');
    expect(migration).toContain('s.expires_at > now()');
    expect(migration).toContain("value not in ('HOST_ONLY', 'DJ_MC', 'HOST_AND_DJ_VIP')");
    expect(migration).toContain('security definer');
    expect(migration).toContain("revoke all on function public.stage_deck_set_service_package(text) from public, anon");
  });

  it('updates the cartridge value, advances the revision and never re-provisions roles', () => {
    expect(migration).toContain("'{servicePackage}'");
    expect(migration).toContain('jsonb_set');
    expect(migration).toContain('insert into public.cartridge_revisions');
    expect(migration).toContain('cartridge_revision = new_revision');
    expect(migration).not.toContain('insert into public.role_sessions');
    expect(migration).not.toContain('update public.role_sessions');
    expect(migration).not.toContain('role_presence');
    expect(migration).not.toContain('vip_djs');
  });

  it('wires the RPC through the sync client and the Venue Manager view', () => {
    expect(client).toContain("supabase.rpc('stage_deck_set_service_package'");
    expect(client).toContain('p_service_package: servicePackage');
    expect(view).toContain('SERVICE_PACKAGES.map');
    expect(view).toContain("t('venueManager.package.ownerNote')");
    expect(view).toContain('isServicePackage(packageValue)');
    expect(deck).toContain('onSaveServicePackage={saveServicePackage}');
  });
});
