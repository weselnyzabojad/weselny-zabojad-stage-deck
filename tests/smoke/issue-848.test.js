import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #848 role-scoped cartridge projection', () => {
  it('uses a role-aware RPC instead of direct cartridge selects', () => {
    const sql = read('supabase/migrations/202611130003_role_cartridge_projection.sql');
    const fix = read('supabase/migrations/202611130004_role_cartridge_projection_fix.sql');
    const client = read('src/lib/sync/supabaseSyncClient.js');

    expect(sql).toContain('create or replace function public.stage_deck_wedding()');
    expect(sql).toContain('revoke select on public.weddings from authenticated');
    expect(sql).toContain("cartridge - 'speeches'");
    expect(sql).toContain("? 'speaker'");
    expect(fix).toContain('jsonb_typeof(speech->\'visibleToRoles\')');
    expect(client).toContain("supabase.rpc('stage_deck_wedding')");
    expect(client).not.toContain(".from('weddings')");
  });
});
