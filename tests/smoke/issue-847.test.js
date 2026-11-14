import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #847 destructive wipe RPC removal', () => {
  it('drops the exposed MC wipe RPC and removes the client path', () => {
    const schema = read('supabase/schema.sql');
    const migration = read('supabase/migrations/202611130002_drop_wipe_room_rpc.sql');
    const client = read('src/lib/sync/supabaseSyncClient.js');

    expect(schema).not.toContain('stage_deck_wipe_my_room');
    expect(migration).toContain('drop function if exists public.stage_deck_wipe_my_room()');
    expect(client).not.toContain('wipeRoom');
    expect(client).not.toContain('stage_deck_wipe_my_room');
  });
});
