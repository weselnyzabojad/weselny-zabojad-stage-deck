import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ADMIN_BUTTON, ADMIN_CARD } from '../src/admin/adminUi.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #994 admin design system', () => {
  it('exposes one helper per action variant and a card surface', () => {
    expect(Object.keys(ADMIN_BUTTON)).toEqual(['primary', 'secondary', 'ghost', 'danger']);
    expect(ADMIN_CARD).toContain('admin-card');
    for (const value of Object.values(ADMIN_BUTTON)) {
      expect(value).toMatch(/^admin-btn admin-btn-(primary|secondary|ghost|danger)$/);
    }
  });

  it('defines the component styles and keeps red in the danger variant only', () => {
    const css = read('index.css');
    expect(css).toContain('.admin-btn-primary');
    expect(css).toContain('.admin-btn-secondary');
    expect(css).toContain('.admin-btn-ghost');
    expect(css).toContain('.admin-btn-danger');
    expect(css).toContain('.admin-card');
    const danger = css.slice(css.indexOf('.admin-btn-danger'), css.indexOf('.admin-card'));
    expect(danger).toContain('red-');
    const others = css.slice(0, css.indexOf('.admin-btn-danger'));
    expect(others).not.toContain('red-');
  });

  it('uses the hierarchy in the admin shell and shared dialogs', () => {
    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain("from './adminUi'");
    expect(app).toContain('ADMIN_BUTTON.primary');
    expect(app).toContain('ADMIN_BUTTON.secondary');
    expect(app).toContain('ADMIN_BUTTON.ghost');
    expect(app).toContain('ADMIN_BUTTON.danger');

    const dialogs = read('src/admin/AdminDialogs.jsx');
    expect(dialogs).toContain('ADMIN_BUTTON.danger');
    expect(dialogs).toContain('ADMIN_BUTTON.primary');

    const providers = read('src/admin/AdminServiceProviders.jsx');
    expect(providers).toContain('ADMIN_BUTTON.danger');
    expect(providers).toContain('ADMIN_BUTTON.secondary');
  });

  it('documents the mapping', () => {
    const doc = read('docs/admin-ui.md');
    expect(doc).toContain('| Primary |');
    expect(doc).toContain('One solid primary action per admin view');
    expect(doc).toContain('Red is reserved for destructive actions');
  });
});
