import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HEALTH_DOT_CLASSES, HEALTH_TONE_CLASSES } from '../src/admin/adminHealth.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const css = read('src/index.css');

function token(name) {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`Missing token --${name}`);
  return match[1];
}

function luminance(hex) {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

describe('issue #1287 landing-aligned monitor tokens', () => {
  it('defines the landing surface, ink, accent and radius tokens', () => {
    expect(token('monitor-surface')).toBe('#ffffff');
    expect(token('monitor-surface-muted')).toBe('#faf8f5');
    expect(token('monitor-border')).toBe('#eae2d3');
    expect(token('monitor-ink')).toBe('#292524');
    expect(token('monitor-muted')).toBe('#78716c');
    expect(token('monitor-accent')).toBe('#b89550');
    expect(token('monitor-accent-soft')).toBe('#f7f2e7');

    for (const name of [
      'monitor-surface',
      'monitor-surface-muted',
      'monitor-border',
      'monitor-ink',
      'monitor-muted',
      'monitor-accent',
      'monitor-accent-soft',
    ]) {
      expect(css).toContain(`--color-${name}: var(--${name})`);
    }
  });

  it('defines semantic healthy, error, warning and checking tints', () => {
    for (const state of ['healthy', 'error', 'warning', 'checking']) {
      for (const part of ['bg', 'border', 'text', 'dot']) {
        expect(token(`monitor-${state}-${part}`)).toMatch(/^#[0-9a-f]{6}$/);
        expect(css).toContain(
          `--color-monitor-${state}-${part}: var(--monitor-${state}-${part})`,
        );
      }
    }
  });

  it('keeps every semantic text pairing at WCAG AA contrast', () => {
    for (const state of ['healthy', 'error', 'warning', 'checking']) {
      const ratio = contrast(
        token(`monitor-${state}-text`),
        token(`monitor-${state}-bg`),
      );
      expect(ratio, `${state} text contrast`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(token('monitor-ink'), token('monitor-surface'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('monitor-muted'), token('monitor-surface'))).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(token('monitor-accent-ink'), token('monitor-accent-soft')),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('uses the semantic tokens in the health tone helpers', () => {
    expect(HEALTH_TONE_CLASSES.ok).toContain('bg-monitor-healthy-bg');
    expect(HEALTH_TONE_CLASSES.ok).toContain('text-monitor-healthy-text');
    expect(HEALTH_TONE_CLASSES.down).toContain('bg-monitor-error-bg');
    expect(HEALTH_TONE_CLASSES.degraded).toContain('bg-monitor-warning-bg');
    expect(HEALTH_TONE_CLASSES.checking).toContain('bg-monitor-checking-bg');
    expect(HEALTH_DOT_CLASSES.ok).toContain('bg-monitor-healthy-dot');
    expect(HEALTH_DOT_CLASSES.down).toContain('bg-monitor-error-dot');
    expect(HEALTH_DOT_CLASSES.down).toContain('motion-reduce:animate-none');

    const source = read('src/admin/adminHealth.js');
    expect(source).not.toMatch(/(emerald|red|slate|indigo)-\d/);
  });

  it('applies landing surfaces and radii to the monitoring strip and drawer', () => {
    const bar = read('src/admin/AdminHealthBar.jsx');
    expect(bar).toContain('rounded-2xl border border-monitor-border bg-monitor-surface');
    expect(bar).toContain('rounded-full border');
    expect(bar).toContain('bg-monitor-surface-muted');
    expect(bar).toContain('text-monitor-error-text');
    expect(bar).toContain('ring-monitor-accent');
    expect(bar).toContain('HEALTH_DOT_CLASSES');
    expect(bar).toContain('HEALTH_TONE_CLASSES');
    // The HTTP code remains a non-colour signal on every pill.
    expect(bar).toContain('healthPillCode(provider, providerChecking)');
    expect(bar).toContain('{code}');
    expect(bar).not.toMatch(/(emerald|red|slate|indigo)-\d/);
  });

  it('retrofits the underline tabs without touching the rest of the admin', () => {
    const app = read('src/admin/AdminApp.jsx');
    const nav = app.slice(app.indexOf('<nav'), app.indexOf('</nav>'));
    expect(nav).toContain('border-monitor-border');
    expect(nav).toContain('border-monitor-accent');
    expect(nav).toContain('text-monitor-accent-ink');
    expect(nav).toContain('text-monitor-muted');
    expect(nav).toContain('hover:bg-monitor-surface-muted');
    expect(nav).not.toMatch(/(indigo|slate)-\d/);
    expect(nav).not.toContain('#64748B');
    expect(nav).not.toContain('#1E293B');
  });
});
