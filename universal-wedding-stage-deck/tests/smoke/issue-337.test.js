import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ADMIN_MIN_VIEWPORT_WIDTH,
  isAdminViewportSupported,
} from '../../src/admin/adminUtils.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #337 admin laptop-only access', () => {
  it('uses an explicit desktop viewport capability', () => {
    expect(ADMIN_MIN_VIEWPORT_WIDTH).toBe(1024);
    expect(isAdminViewportSupported(320)).toBe(false);
    expect(isAdminViewportSupported(768)).toBe(false);
    expect(isAdminViewportSupported(1023)).toBe(false);
    expect(isAdminViewportSupported(1024)).toBe(true);
    expect(isAdminViewportSupported(1440)).toBe(true);
    expect(isAdminViewportSupported(Number.NaN)).toBe(false);
  });

  it('mounts admin content only after the viewport check', () => {
    const admin = read('src/admin/AdminApp.jsx');
    const wrapper = admin.indexOf('export default function AdminApp()');
    const content = admin.indexOf('function AdminAppContent()');
    expect(wrapper).toBeGreaterThan(-1);
    expect(content).toBeGreaterThan(wrapper);
    expect(admin).toContain('if (!supported) return <AdminViewportBlocked />');
    expect(admin).toContain('return <AdminAppContent />');
  });

  it('shows an accessible laptop-required fallback without admin controls', () => {
    const admin = read('src/admin/AdminApp.jsx');
    expect(admin).toContain('Laptop or desktop required');
    expect(admin).toContain('role="alert"');
  });

  it('does not add mobile admin affordances', () => {
    expect(read('src/components/DevViewSwitcher.jsx')).not.toContain('Admin');
    expect(read('src/components/RoleShell.jsx')).not.toContain('admin');
  });
});
