import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  EXPECTED_ORIGIN,
  checkPreflightResult,
  exactSecretError,
  sha256,
} from '../../scripts/check-production-origin.mjs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('production CORS origin release check', () => {
  it('hashes the expected origin exactly', () => {
    expect(sha256(EXPECTED_ORIGIN)).toBe(
      '8db7604ec4aa15e7d7b50094de91459bd584491bb11607471db017e4cbe2b4c0',
    );
  });

  it('accepts the expected origin only when it is actually echoed', () => {
    expect(
      checkPreflightResult(EXPECTED_ORIGIN, {
        status: 200,
        allowOrigin: EXPECTED_ORIGIN,
      }),
    ).toBeNull();
    expect(
      checkPreflightResult(EXPECTED_ORIGIN, { status: 403, allowOrigin: null }),
    ).toContain('HTTP 403');
    expect(
      checkPreflightResult(EXPECTED_ORIGIN, { status: 200, allowOrigin: 'https://other.example' }),
    ).toContain('Access-Control-Allow-Origin');
  });

  it('rejects any non-production origin that is accepted or echoed', () => {
    expect(checkPreflightResult('http://localhost:5173', { status: 403, allowOrigin: null })).toBeNull();
    expect(checkPreflightResult('http://localhost:5173', { status: 200, allowOrigin: null })).toContain(
      'HTTP 200',
    );
    expect(
      checkPreflightResult('http://localhost:5173', {
        status: 403,
        allowOrigin: 'http://localhost:5173',
      }),
    ).toContain('echoed');
  });

  it('compares the exact secret hash when a token is available', () => {
    const expected = sha256(EXPECTED_ORIGIN);
    expect(
      exactSecretError({ secrets: [{ name: 'ALLOWED_ORIGIN', value: expected }] }, 'token'),
    ).toBeNull();
    expect(
      exactSecretError(
        { secrets: [{ name: 'ALLOWED_ORIGIN', value: '0'.repeat(64) }] },
        'token',
      ),
    ).toContain(`exactly ${EXPECTED_ORIGIN}`);
    expect(exactSecretError({ secrets: [] }, 'token')).toContain('not configured');
    expect(exactSecretError({ secrets: [] }, '')).toContain('SUPABASE_ACCESS_TOKEN');
  });

  it('runs the check on the release workflow to master', () => {
    const workflow = read('.github/workflows/validate-pr-target.yml');
    expect(workflow).toContain('name: Production CORS origin');
    expect(workflow).toContain('node scripts/check-production-origin.mjs');
  });
});
