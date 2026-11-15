import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #996 admin library layout', () => {
  it('renders the monitoring strip above the admin tabs', () => {
    const bar = read('src/admin/AdminHealthBar.jsx');
    expect(bar).toContain('Service monitoring');
    expect(bar).toContain('All systems healthy');
    expect(bar).toContain('Retry all');
    expect(bar).toContain('sm:grid-cols-2 xl:grid-cols-3');
    expect(bar).not.toContain('System status');
    expect(bar).not.toContain('aria-expanded={open}');
  });

  it('keeps search, status and role filters on one inline row', () => {
    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain('flex flex-nowrap items-end gap-2 overflow-x-auto');
    expect(app).toContain('min-w-[14rem] flex-1');
    expect(app).toContain('w-36 shrink-0');
    expect(app).toContain('w-40 shrink-0');
    expect(app).toContain('placeholder="Couple, wedding id or room code"');
  });

  it('renders year selectors as semantic tabs', () => {
    const folders = read('src/admin/AdminWeddingFolders.jsx');
    expect(folders).toContain('role="tablist"');
    expect(folders).toContain('role="tab"');
    expect(folders).toContain('aria-selected={active}');
    expect(folders).toContain('border-b-2');
    expect(folders).not.toContain('aria-pressed={active}');
  });
});
