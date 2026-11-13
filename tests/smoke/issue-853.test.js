import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #853 ES256 role token signing', () => {
  it('signs new role tokens with ES256 and keeps an HS256 transition fallback', () => {
    const join = read('supabase/functions/join_room/index.ts');

    expect(join).toContain('DECK_SUPABASE_JWT_PRIVATE_KEY');
    expect(join).toContain('importJWK');
    expect(join).toContain("alg: signingAlg");
    expect(join).toContain("'ES256'");
    expect(join).toContain('DECK_SUPABASE_JWT_SECRET');
  });

  it('verifies ES256 through the project JWKS and accepts legacy tokens temporarily', () => {
    const reveal = read('supabase/functions/reveal_speech_key/index.ts');

    expect(reveal).toContain('createRemoteJWKSet');
    expect(reveal).toContain('decodeProtectedHeader');
    expect(reveal).toContain("algorithms: ['ES256']");
    expect(reveal).toContain("algorithms: ['HS256']");
  });

  it('documents the rotation and rollback order', () => {
    const doc = read('docs/security-role-token-signing.md');

    expect(doc).toContain('supabase gen signing-key --algorithm ES256');
    expect(doc).toContain('DECK_SUPABASE_JWT_PRIVATE_KEY');
    expect(doc).toContain('previously used');
    expect(doc).toContain('DECK_SUPABASE_JWT_SECRET');
  });
});
