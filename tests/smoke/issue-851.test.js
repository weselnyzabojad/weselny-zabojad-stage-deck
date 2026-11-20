import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #851 least-privilege table grants', () => {
  it('revokes broad service-table grants and keeps only role operations', () => {
    const sql = read('supabase/migrations/202611130005_revoke_broad_grants.sql');

    for (const table of [
      'app_admins',
      'admin_audit_log',
      'role_sessions',
      'role_presence',
      'wedding_roles',
      'join_attempts',
      'wedding_service_providers',
      'cartridge_revisions',
      'song_request_attempts',
    ]) {
      expect(sql).toContain(`revoke all on public.${table} from authenticated, anon`);
    }

    expect(sql).toContain('grant select, insert, update on public.live_sync_state');
    expect(sql).toContain('grant update (status, played_at) on public.song_requests');
    expect(sql).not.toContain('grant all');
  });
});
