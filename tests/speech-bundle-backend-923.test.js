import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #923 speech bundle backend', () => {
  it('defines the encrypted bundle, revision, access, session, live and log tables', () => {
    const sql = read('supabase/migrations/202611140005_speech_bundle_backend.sql');
    for (const table of [
      'speech_records',
      'speech_revisions',
      'speech_access',
      'speech_sessions',
      'speech_live',
      'speech_logs',
    ]) {
      expect(sql).toContain(`create table if not exists public.${table}`);
      expect(sql).toContain(`revoke all on public.${table}`);
    }
    expect(sql).toContain('on delete cascade');
    expect(sql).toContain("interval '90 days'");
  });

  it('encrypts whole scripts with AES-256-GCM and drops markers', () => {
    const crypto = read('supabase/functions/_shared/speechBundle.js');
    expect(crypto).toContain('AES-256-GCM');
    expect(crypto).toContain('deriveSpeechKeyBytes');
    expect(crypto).toContain('stripSecretMarkers');
    expect(crypto).toContain('additionalData');
  });

  it('ships role projections and live start/end in the bundle endpoint', () => {
    const fn = read('supabase/functions/speech_bundle/index.ts');
    expect(fn).toContain("action === 'list'");
    expect(fn).toContain("action === 'key'");
    expect(fn).toContain("action === 'start' || action === 'end'");
    expect(fn).toContain("SUMMARY_ROLES");
    expect(fn).toContain("SPEAKER_ROLES");
    expect(fn).toContain("MC_ROLES");
    expect(fn).toContain("active_speech_id");
  });

  it('adds admin preview, publish, restore, delete and mode guards', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    for (const action of [
      'list_speeches',
      'publish_speech',
      'restore_speech',
      'delete_speech',
      'set_speech_mode',
    ]) {
      expect(api).toContain(`action === '${action}'`);
    }
    expect(api).toContain('Publishing is blocked while a speech is live');
    expect(api).toContain('Restore is blocked while a speech is live');
    expect(api).toContain('Speech mode cannot change while a speech is live');
    expect(api).toContain('speech_logs');
  });
});
