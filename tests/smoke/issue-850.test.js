import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkPasswordBreach } from '../../supabase/functions/_shared/passwordBreach.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');
const password = 'correct horse battery staple';
const hash = createHash('sha1').update(password).digest('hex').toUpperCase();
const suffix = hash.slice(5);

describe('issue #850 free HIBP password change flow', () => {
  it('detects breached passwords with k-anonymity', async () => {
    let requested = '';
    const result = await checkPasswordBreach(password, {
      fetchImpl: async (url) => {
        requested = url;
        return { ok: true, text: async () => `${suffix}:3\r\n0000000000000000000000000000000000:0` };
      },
    });

    expect(result).toEqual({ ok: true, breached: true });
    expect(requested.endsWith(hash.slice(0, 5))).toBe(true);
    expect(requested).not.toContain(password);
  });

  it('returns not breached and unavailable safely', async () => {
    expect(
      await checkPasswordBreach(password, {
        fetchImpl: async () => ({
          ok: true,
          text: async () => `${'0'.repeat(35)}:1`,
        }),
      }),
    ).toEqual({ ok: true, breached: false });

    expect(
      await checkPasswordBreach(password, {
        fetchImpl: async () => ({ ok: false, text: async () => '' }),
      }),
    ).toEqual({ ok: false, unavailable: true });
  });

  it('wires the check into admin_api and the admin UI', () => {
    const adminApi = read('supabase/functions/admin_api/index.ts');
    const dialogs = read('src/admin/AdminDialogs.jsx');
    const app = read('src/admin/AdminApp.jsx');

    expect(adminApi).toContain("import { checkPasswordBreach }");
    expect(adminApi).toContain("'change_password'");
    expect(adminApi).toContain('admin.auth.admin.updateUserById');
    expect(adminApi).toContain("code: 'password_breached'");
    expect(dialogs).toContain('function AdminPasswordDialog');
    expect(dialogs).toContain('HaveIBeenPwned');
    expect(app).toContain('changeAdminPassword');
    expect(app).toContain('<AdminPasswordDialog');
  });
});
