import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1285 admin underline tabs', () => {
  it('keeps the four sections and replaces boxed buttons with underline tabs', () => {
    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain("['overview', 'Overview']");
    expect(app).toContain("['weddings', 'Weddings']");
    expect(app).toContain("['presence', 'Live presence']");
    expect(app).toContain("['audit', 'Audit log']");
    expect(app).toContain('border-b border-monitor-border');
    expect(app).toContain('border-monitor-accent text-monitor-accent-ink');
    expect(app).toContain('border-transparent text-monitor-muted');
    expect(app).toContain('hover:text-monitor-ink');
    expect(app).toContain('-mb-px border-b-2');
    expect(app).toContain('pb-2 pt-1.5');
    expect(app).not.toContain('rounded border px-3 py-1.5 font-semibold');
  });

  it('exposes semantic tab and panel wiring', () => {
    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain('role="tablist"');
    expect(app).toContain('role="tab"');
    expect(app).toContain('role="tabpanel"');
    expect(app).toContain('aria-selected={active}');
    expect(app).toContain('aria-controls="admin-tab-panel"');
    expect(app).toContain('aria-labelledby={`admin-tab-${tab}`}');
    expect(app).toContain('id={`admin-tab-${id}`}');
    expect(app).toContain('tabIndex={active ? 0 : -1}');
  });

  it('supports arrow, Home and End keyboard navigation', () => {
    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain('onTabKeyDown');
    expect(app).toContain("event.key === 'ArrowRight'");
    expect(app).toContain("event.key === 'ArrowLeft'");
    expect(app).toContain("event.key === 'Home'");
    expect(app).toContain("event.key === 'End'");
    expect(app).toContain('event.preventDefault()');
    expect(app).toContain('changeTab(nextId, { focusPanel: false })');
    expect(app).toContain("document.getElementById(`admin-tab-${nextId}`)?.focus()");
  });
});
