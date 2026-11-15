import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1079 status menu stacking', () => {
  it('lifts the top-bar stacking context above the secondary bar', () => {
    const shell = read('src/components/TopBarShell.jsx');
    expect(shell).toContain('relative z-banner');
  });

  it('renders the open menu above header controls and following bars', () => {
    const menu = read('src/components/StatusMenu.jsx');
    expect(menu).toContain('absolute right-0 z-toast');
    expect(menu).toContain('role="menu"');
  });

  it('keeps the status menu below modal and critical overlays', () => {
    const css = read('src/index.css');
    expect(css).toContain('--z-toast: 60');
    expect(css).toContain('--z-modal: 70');
  });
});
