import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HEALTH_DOT_CLASSES, HEALTH_PROVIDER_ORDER } from '../src/admin/adminHealth.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1289 Wedding Monitor mobile layout', () => {
  it('keeps all 12 service pills in a two-column mobile grid', () => {
    expect(HEALTH_PROVIDER_ORDER).toHaveLength(12);

    const bar = read('src/admin/AdminHealthBar.jsx');
    expect(bar).toContain('grid w-full min-w-0 grid-cols-2 gap-1.5');
    expect(bar).toContain('sm:flex sm:flex-1 sm:flex-wrap sm:items-center');
    expect(bar).toContain('min-h-11 w-full min-w-0');
    expect(bar).toContain('sm:min-h-0 sm:w-auto sm:max-w-[190px]');
    expect(bar).toContain('<span className="min-w-0 truncate">{provider.name}</span>');
  });

  it('uses 44 px touch targets in the strip and drawer actions', () => {
    const bar = read('src/admin/AdminHealthBar.jsx');
    expect(bar).toContain('min-h-11 px-3 text-[10px]');
    expect(bar).toContain('min-h-11 min-w-11 px-2');
    expect(bar).toContain('Open URL');
    expect(bar).toContain('mt-1.5 w-full rounded-2xl border border-monitor-border');
    expect(bar.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('stacks the strip header without horizontal overflow', () => {
    const bar = read('src/admin/AdminHealthBar.jsx');
    expect(bar).toContain(
      'flex w-full min-w-0 flex-col gap-2 rounded-2xl border border-monitor-border',
    );
    expect(bar).toContain('sm:min-h-11 sm:flex-row sm:flex-wrap sm:items-center sm:py-1.5');
    expect(bar).toContain('flex w-full min-w-0 flex-wrap items-center gap-2 sm:contents');
    expect(bar).toContain('max-w-full shrink-0 items-center gap-1.5 rounded-full border');
    expect(bar).toContain('grid w-full min-w-0 grid-cols-2');
  });

  it('respects standalone safe-area insets only in monitor mode', () => {
    const css = read('src/index.css');
    expect(css).toContain('@utility monitor-safe-area');
    expect(css).toContain('padding-top: env(safe-area-inset-top)');
    expect(css).toContain('padding-bottom: env(safe-area-inset-bottom)');

    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain("statusMode ? 'monitor-safe-area' : ''");
    expect(app).toContain('flex flex-wrap items-center gap-2 text-xs');
  });

  it('keeps the desktop admin strip compact and the error pulse reduced-motion aware', () => {
    const bar = read('src/admin/AdminHealthBar.jsx');
    expect(bar).toContain('sm:flex-row');
    expect(bar).toContain('sm:py-1.5');
    expect(HEALTH_DOT_CLASSES.down).toContain('motion-reduce:animate-none');
  });
});
