import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1134 wedding recap backend', () => {
  const migration = read('supabase/migrations/202611160003_wedding_recaps.sql');
  const admin = read('supabase/functions/admin_api/index.ts');
  const publicFn = read('supabase/functions/recap/index.ts');

  it('stores immutable snapshots with hashed tokens and a 90-day expiry', () => {
    expect(migration).toContain('create table if not exists public.wedding_recaps');
    expect(migration).toContain('token_hash      text not null unique');
    expect(migration).toContain('payload         jsonb not null');
    expect(migration).toContain('expires_at      timestamptz not null');
    expect(migration).toContain('revoked_at      timestamptz');
    expect(migration).toContain('wedding_recaps_expiry_after_publish');
    expect(admin).toContain("90 * 24 * 60 * 60 * 1000");
  });

  it('keeps the tables service-role-only', () => {
    expect(migration).toContain('alter table public.wedding_recaps enable row level security');
    expect(migration).toContain(
      'revoke all on public.wedding_recaps from anon, authenticated',
    );
    expect(migration).toContain(
      'revoke all on public.recap_access_attempts from anon, authenticated',
    );
    expect(migration).not.toMatch(/create policy .*wedding_recaps/i);
  });

  it('provides owner management actions and hashes the token in the API', () => {
    for (const action of [
      "action === 'recap_source'",
      "action === 'publish_recap'",
      "action === 'list_recaps'",
      "action === 'revoke_recap'",
    ]) {
      expect(admin).toContain(action);
    }
    expect(admin).toContain('randomRecapToken');
    expect(admin).toContain('sha256Hex(token)');
    expect(admin).toContain('token_hash: tokenHash');
    expect(admin).toContain("writeAudit(admin, allowlisted, 'recap_revoke'");
    expect(admin).toContain("writeAudit(admin, allowlisted, 'recap_publish'");
    expect(admin).toContain('Recap payload contains a private field');
  });

  it('serves only valid, unexpired, non-revoked tokens with rate limiting', () => {
    expect(publicFn).toContain('sha256(token');
    expect(publicFn).toContain(".eq('token_hash', tokenHash)");
    expect(publicFn).toContain('data.revoked_at');
    expect(publicFn).toContain('Date.parse(data.expires_at) <= Date.now()');
    expect(publicFn).toContain('RATE_MAX_ATTEMPTS');
    expect(publicFn).toContain('recap_access_attempts');
    expect(publicFn).toContain("'X-Robots-Tag': 'noindex, nofollow'");
    expect(publicFn).toContain("This recap link is no longer available.");
  });

  it('purges expired snapshots and rate-limit rows on a schedule', () => {
    expect(migration).toContain('stage_deck_purge_expired_recaps');
    expect(migration).toContain('delete from public.wedding_recaps');
    expect(migration).toContain('delete from public.recap_access_attempts');
    expect(migration).toContain('stage-deck-recap-retention');
    expect(migration).toContain('cron.schedule');
  });
});
