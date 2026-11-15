import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #997 wedding detail actions and roles', () => {
  it('keeps two primary card actions and moves the rest into More actions', () => {
    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain('Rotate PINs');
    expect(app).toContain('QR cards');
    expect(app).toContain('More actions');
    expect(app).toContain('role="menu"');
    expect(app).toContain('role="menuitem"');
    expect(app).toContain('Replace cartridge');
    expect(app).toContain('Restore previous');
    expect(app).toContain('Archive');
    expect(app).toContain('ADMIN_BUTTON.danger');
  });

  it('renders role tags as filled/missing status dots', () => {
    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain('ROLE_IDS.map((role) =>');
    expect(app).toContain("filled ? 'filled' : 'missing'");
    expect(app).toContain('bg-emerald-400');
    expect(app).toContain('bg-line-strong');
  });

  it('renders providers as a table with row-level actions', () => {
    const panel = read('src/admin/AdminServiceProviders.jsx');
    expect(panel).toContain('<table');
    expect(panel).toContain('Role access');
    expect(panel).toContain('Actions');
    expect(panel).toContain('role="menu"');
    expect(panel).toContain('Actions for ');
    expect(panel).toContain('Deactivate');
    expect(panel).toContain('Delete');
    expect(panel).toContain('readOnly');
  });
});
