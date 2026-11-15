import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as sharing from '../supabase/functions/_shared/driveSharing.js';
import { WEDDING_ID_PATTERN } from '../supabase/functions/_shared/adminPublish.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1049 schema safety and shared contracts', () => {
  it('makes schema.sql base-only and re-run safe', () => {
    const schema = read('supabase/schema.sql');
    expect(schema).toContain('schema.sql is base-only');
    expect(schema).toContain('supabase_migrations.schema_migrations');
    expect(schema).not.toContain('stage_deck_wipe_room');
  });

  it('uses one wedding-id pattern across publishing and sharing', () => {
    expect(sharing.WEDDING_ID_PATTERN).toBe(WEDDING_ID_PATTERN);
    expect(WEDDING_ID_PATTERN.test('A&B-UM-2026-08-001')).toBe(true);
    expect(WEDDING_ID_PATTERN.test('UM-2026-08-001')).toBe(false);
  });

  it('keeps secrets folder names aligned', () => {
    const drive = read('supabase/functions/_shared/googleDrive.js');
    expect(drive).toContain("DRIVE_SECRETS_FOLDER_NAME = 'secrets'");
    expect(sharing.SECRETS_FOLDER_NAME).toBe('secrets');
  });

  it('documents the migration order', () => {
    const docs = read('docs/migrations.md');
    expect(docs).toContain('base-only');
    expect(docs).toContain('Apply every file in `supabase/migrations/`');
    expect(docs).toContain('Do not run');
  });
});
