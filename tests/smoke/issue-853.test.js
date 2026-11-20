import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #853 ES256 role token signing', () => {
  it('signs role tokens with ES256 only', () => {
    const join = read('supabase/functions/join_room/index.ts');

    expect(join).toContain('DECK_SUPABASE_JWT_PRIVATE_KEY');
    expect(join).toContain('importJWK');
    expect(join).toContain('delete jwk.key_ops');
    expect(join).toContain("alg: signingAlg");
    expect(join).toContain("'ES256'");
    expect(join).not.toContain('DECK_SUPABASE_JWT_SECRET');
    expect(join).not.toContain("signingAlg = 'HS256'");
  });

  it('verifies role tokens through the project JWKS with ES256 only', () => {
    const reveal = read('supabase/functions/reveal_speech_key/index.ts');

    expect(reveal).toContain('createRemoteJWKSet');
    expect(reveal).toContain('decodeProtectedHeader');
    expect(reveal).toContain("algorithms: ['ES256']");
    expect(reveal).not.toContain('DECK_SUPABASE_JWT_SECRET');
    expect(reveal).not.toContain("algorithms: ['HS256']");
  });

  it('does not require the removed HS256 secret in admin_api', () => {
    const admin = read('supabase/functions/admin_api/index.ts');

    expect(admin).not.toContain('DECK_SUPABASE_JWT_SECRET');
  });

  it('documents the rotation order and the removed fallback', () => {
    const doc = read('docs/security-role-token-signing.md');

    expect(doc).toContain('supabase gen signing-key --algorithm ES256');
    expect(doc).toContain('DECK_SUPABASE_JWT_PRIVATE_KEY');
    expect(doc).toContain('was removed');
    expect(doc).toContain('no HS256 fallback');
  });
});
