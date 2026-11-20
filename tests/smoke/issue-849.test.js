import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #849 public email signup disabled', () => {
  it('keeps the hosted auth config fail-closed for signup', () => {
    const config = read('supabase/config.toml');

    expect(config).toContain('project_id = "stage-deck"');
    expect(config).toContain('[auth]');
    expect(config).toContain('enable_signup = false');
    expect(config).not.toContain('enable_signup = true');
  });
});
