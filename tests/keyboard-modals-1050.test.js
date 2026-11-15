import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1050 keyboard shortcuts and modal focus', () => {
  it('ignores clicker shortcuts inside interactive controls and prevented events', () => {
    const clicker = read('src/components/GameClickerOverlay.jsx');
    expect(clicker).toContain('if (event.defaultPrevented) return;');
    expect(clicker).toContain('target.closest(');
    expect(clicker).toContain('button, a, input, select, textarea');
    expect(clicker).toContain('[contenteditable="true"]');
    expect(clicker).toContain("event.key === 'ArrowRight'");
    expect(clicker).toContain("event.key === ' '");
  });

  it('keeps an auto-focused control inside a modal', () => {
    const shell = read('src/components/ModalShell.jsx');
    expect(shell).toContain('dialog.contains(document.activeElement)');
    expect(shell).toContain('closeRef.current?.focus()');
    expect(shell).toContain("if (event.key === 'Escape')");
    expect(shell).toContain("event.key !== 'Tab'");
  });

  it('gives every admin dialog a title id and MFA keeps code autofocus', () => {
    const dialogs = read('src/admin/AdminDialogs.jsx');
    const labelled = dialogs.match(/labelledBy=\{titleId\}/g) ?? [];
    const titled = dialogs.match(/titleId=\{titleId\}/g) ?? [];
    expect(labelled.length).toBeGreaterThanOrEqual(5);
    expect(titled.length).toBeGreaterThanOrEqual(5);
    expect(dialogs).not.toContain('labelledBy={undefined}');
    const mfa = dialogs.slice(dialogs.indexOf('export function AdminMfaDialog'), dialogs.indexOf('export function AdminPasswordDialog'));
    expect(mfa).toContain('autoFocus');
  });
});
