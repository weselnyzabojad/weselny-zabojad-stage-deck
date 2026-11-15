import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isSyncAuthError } from '../src/lib/sync/syncErrors.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1040 session revocation and expiry', () => {
  it('revokes both role and speech sessions by jti', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    const block = api.slice(api.indexOf("if (action === 'revoke_session')"), api.indexOf("if (action === 'list_roles')"));
    expect(block).toContain("from('role_sessions')");
    expect(block).toContain("from('speech_sessions')");
    expect(block).toContain('.eq(\'jti\', jti)');
    expect(block).toContain('revoked_at');
  });

  it('expires an open deck and clears role-scoped caches', () => {
    const app = read('src/App.jsx');
    const block = app.slice(app.indexOf('Issue #1040'), app.indexOf('if (IS_PRODUCTION && !sessionValid)'));
    expect(block).toContain('roleSession.expiresAt - Date.now()');
    expect(block).toContain('window.setTimeout(expire');
    expect(block).toContain('clearSpeechScriptsForWedding');
    expect(block).toContain('clearGameQuestionsForWedding');
    expect(block).toContain('clearSpeechKeysForWedding');
    expect(block).toContain('clearSpeakerAccessCache');
    expect(block).toContain('clearRoleSession()');
  });

  it('marks speech bundle 401/403 as auth failures', () => {
    const client = read('src/lib/speechBundleClient.js');
    expect(client).toContain('authFailure: response.status === 401 || response.status === 403');
  });

  it('distinguishes auth failures from network errors', () => {
    expect(isSyncAuthError({ status: 401 })).toBe(true);
    expect(isSyncAuthError({ status: 403 })).toBe(true);
    expect(isSyncAuthError({ code: 'PGRST301' })).toBe(true);
    expect(isSyncAuthError({ message: 'JWT expired' })).toBe(true);
    expect(isSyncAuthError({ message: 'Failed to fetch' })).toBe(false);
    expect(isSyncAuthError(new TypeError('NetworkError'))).toBe(false);
  });

  it('keeps auth failures visible in the sync error state', () => {
    const hook = read('src/hooks/useLiveStageState.js');
    expect(hook).toContain('isSyncAuthError(error)');
    expect(hook).toContain('Session error:');
  });
});
