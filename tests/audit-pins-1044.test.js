import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1044 provider PINs stay out of audit logs', () => {
  it('audits provider role access without the plaintext PIN', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    const block = api.slice(api.indexOf("if (action === 'upsert_provider')"), api.indexOf("if (action === 'deactivate_provider')"));
    expect(block).toContain('const roleAccessAudit = roleAccess');
    expect(block).toContain('created: Boolean(roleAccess.pin)');
    expect(block).toContain('revoked: roleAccess.revoked === true');
    expect(block).toContain('roleAccess: roleAccessAudit');
    expect(block).not.toMatch(/writeAudit\([\s\S]*?roleAccess,\s*\}\)/);
  });

  it('still returns the one-time PIN to the owner', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    expect(api).toContain('return json({ provider: data, roleAccess });');
  });

  it('keeps other audit paths free of PIN payloads', () => {
    const api = read('supabase/functions/admin_api/index.ts');
    const rotate = api.slice(api.indexOf("if (action === 'rotate_pins')"), api.indexOf("if (action === 'revoke_session')"));
    expect(rotate).toContain('writeAudit(admin, allowlisted, \'rotate_pins\', weddingId, { roles });');
    expect(rotate).not.toContain('pins,');
    expect(api).toContain('pinIssued: Boolean(pin)');
  });
});
