import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #760 Supabase Edge Function secrets and deployment docs', () => {
  it('documents the complete server secret set', () => {
    const readme = read('README.md');
    const docs = read('docs/admin-setup-and-secrets.md');

    for (const name of [
      'DECK_SUPABASE_JWT_PRIVATE_KEY',
      'DECK_SUPABASE_JWT_KEY_ID',
      'PUBLIC_DECK_URL',
      'ALLOWED_ORIGIN',
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
      'SPEECH_SECRET_MASTER_KEY',
    ]) {
      expect(readme).toContain(name);
      expect(docs).toContain(name);
    }
  });

  it('includes the signing-key kid in role tokens', () => {
    const joinRoom = read('supabase/functions/join_room/index.ts');

    expect(joinRoom).toContain('DECK_SUPABASE_JWT_KEY_ID');
    expect(joinRoom).toContain('kid: JWT_KEY_ID');
    expect(joinRoom).toContain('alg: signingAlg');
  });

  it('deploys reveal_speech_key without platform JWT verification', () => {
    const readme = read('README.md');
    const docs = read('docs/admin-setup-and-secrets.md');

    expect(readme).toContain('supabase functions deploy reveal_speech_key --no-verify-jwt');
    expect(docs).toContain('supabase functions deploy reveal_speech_key --no-verify-jwt');
    expect(docs).toContain('UNAUTHORIZED_LEGACY_JWT');
  });

  it('keeps production URLs at the deck root and admin origin', () => {
    const docs = read('docs/admin-setup-and-secrets.md');

    expect(docs).toContain('PUBLIC_DECK_URL=https://your-domain.example');
    expect(docs).toContain('ALLOWED_ORIGIN=https://deck.weselnyzabojad.pl');
  });
});
