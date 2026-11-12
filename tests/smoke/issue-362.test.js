import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ADMIN_PATH,
  LEGACY_ADMIN_PATH,
  isAdminPath,
  isLegacyAdminPath,
} from '../../src/admin/adminUtils.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #362 admin route', () => {
  it('serves the owner panel at /admin', () => {
    expect(ADMIN_PATH).toBe('/admin');
    expect(isAdminPath('/admin')).toBe(true);
    expect(isAdminPath('/admin/')).toBe(true);
    expect(isAdminPath('/deck/admin')).toBe(false);
  });

  it('recognizes the legacy path for redirect only', () => {
    expect(LEGACY_ADMIN_PATH).toBe('/deck/admin');
    expect(isLegacyAdminPath('/deck/admin')).toBe(true);
    expect(isLegacyAdminPath('/admin')).toBe(false);
  });

  it('redirects the legacy path and never mounts admin there', () => {
    const main = read('src/main.jsx');
    expect(main).toContain('isLegacyAdminPath');
    expect(main).toContain('window.location.replace');
    expect(main).toContain('Admin moved');
    expect(main).toContain('isAdminPath(window.location.pathname)');
  });

  it('updates active docs and copy', () => {
    expect(read('README.md')).toContain('| `/admin` |');
    expect(read('README.md')).not.toContain('| `/deck/admin` |');
    expect(read('src/i18n/en.js')).toContain('from /admin');
    expect(read('src/i18n/fr.js')).toContain('depuis /admin');
    expect(read('src/i18n/pl.js')).toContain('w /admin');
  });
});
