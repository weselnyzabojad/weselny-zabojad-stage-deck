import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminConfirmDialog } from '../../src/admin/AdminDialogs.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #534 accessible admin confirmations', () => {
  it('leaves no native confirm/prompt calls in admin code', () => {
    for (const file of [
      'src/admin/AdminApp.jsx',
      'src/admin/AdminDialogs.jsx',
      'src/admin/AdminDrivePanel.jsx',
      'src/admin/AdminServiceProviders.jsx',
    ]) {
      expect(read(file), file).not.toMatch(/window\.(confirm|prompt)/);
    }
  });

  it('uses the shared dialog for Drive publishing', () => {
    const panel = read('src/admin/AdminDrivePanel.jsx');
    expect(panel).toContain("import { AdminConfirmDialog } from './AdminDialogs'");
    expect(panel).toContain('<AdminConfirmDialog');
    expect(panel).toContain('confirmPublish');
    expect(panel).toContain('publishConfirmOpen');
    expect(panel).not.toContain('window.confirm');
  });

  it('uses the shared dialog with text confirmation for provider deletion', () => {
    const panel = read('src/admin/AdminServiceProviders.jsx');
    expect(panel).toContain("import { AdminConfirmDialog } from './AdminDialogs'");
    expect(panel).toContain('<AdminConfirmDialog');
    expect(panel).toContain('requireText=');
    expect(panel).toContain('confirmRemove');
    expect(panel).not.toContain('window.confirm');
  });

  it('renders a labelled and described dialog', () => {
    const html = renderToStaticMarkup(
      createElement(AdminConfirmDialog, {
        open: true,
        title: 'Delete service provider',
        description: 'This cannot be undone.',
        confirmLabel: 'Delete provider',
        tone: 'danger',
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-labelledby=');
    expect(html).toContain('aria-describedby=');
    expect(html).toContain('Delete service provider');
    expect(html).toContain('This cannot be undone.');
  });

  it('keeps TOTP re-auth on the accessible MFA dialog', () => {
    expect(read('src/admin/AdminApp.jsx')).toContain('<AdminMfaDialog');
    expect(read('src/admin/AdminDialogs.jsx')).toContain('export function AdminMfaDialog');
  });
});
