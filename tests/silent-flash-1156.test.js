import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SILENT_FLASH_MS, createFlashWindow } from '../src/lib/flashWindow.js';
import SilentFlashAnnouncement from '../src/components/SilentFlashAnnouncement.jsx';
import { setLocale } from '../src/i18n/index.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

afterEach(() => {
  vi.useRealTimers();
  setLocale('en', { persist: false });
});

describe('Silent Flash window (issue #1156)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('runs for exactly four seconds after a new revision', () => {
    const changes = [];
    const flash = createFlashWindow({ onChange: (active) => changes.push(active) });

    expect(SILENT_FLASH_MS).toBe(4000);
    expect(flash.trigger('2026-11-17T20:00:00.000Z')).toBe(true);
    expect(changes).toEqual([true]);

    vi.advanceTimersByTime(3999);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1);
    expect(changes).toEqual([true, false]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('never re-triggers for the same revision or an empty one', () => {
    const onChange = vi.fn();
    const flash = createFlashWindow({ onChange });

    expect(flash.trigger(null)).toBe(false);
    expect(flash.trigger('')).toBe(false);
    expect(flash.trigger('rev-1')).toBe(true);
    expect(flash.trigger('rev-1')).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('restarts on a newer revision and cancels the previous timer', () => {
    const changes = [];
    const flash = createFlashWindow({ onChange: (active) => changes.push(active) });

    flash.trigger('rev-1');
    vi.advanceTimersByTime(3000);
    flash.trigger('rev-2');
    vi.advanceTimersByTime(3999);
    expect(changes).toEqual([true, true]);

    vi.advanceTimersByTime(1);
    expect(changes).toEqual([true, true, false]);
    // The original rev-1 timer must not have fired at the 4 s mark.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the window and its timer on unmount', () => {
    const changes = [];
    const flash = createFlashWindow({ onChange: (active) => changes.push(active) });

    flash.trigger('rev-1');
    flash.clear();
    expect(changes).toEqual([true, false]);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5000);
    expect(changes).toEqual([true, false]);
  });
});

describe('Silent Flash card contract', () => {
  it('targets only the current card and announces the change to screen readers', () => {
    const stack = read('src/components/TimelineFocusStack.jsx');
    expect(stack).toContain('useSilentFlash(flash)');
    expect(stack).toContain("className={flashing ? 'current-step-flash' : ''}");
    expect(stack).toContain('<SilentFlashAnnouncement change={flash?.change} />');
    expect(stack.match(/currentZone/g)).toHaveLength(3);

    const tilt = read('src/components/CurrentStepTilt.jsx');
    expect(tilt).toContain('className = \'\'');
    expect(tilt).toContain('current-step-tilt transform-gpu ${className}');
  });

  it('uses the shared schedule-change copy, not new locale keys', () => {
    const announcement = read('src/components/SilentFlashAnnouncement.jsx');
    expect(announcement).toContain("t('scheduleChange.title')");
    expect(announcement).toContain("t('scheduleChange.body'");
    expect(announcement).toContain('role="status"');
    expect(announcement).toContain('aria-live="polite"');
    expect(announcement).toContain('sr-only');
  });

  it('renders the announcement with localized interpolation', () => {
    setLocale('fr', { persist: false });
    const html = renderToStaticMarkup(
      createElement(SilentFlashAnnouncement, {
        change: {
          authorRole: 'venue_manager',
          stepTitle: 'Première danse',
          from: '20:15',
          to: '20:30',
        },
      }),
    );

    expect(html).toContain('Planning mis à jour');
    expect(html).toContain('Responsable du lieu');
    expect(html).toContain('Première danse');
    expect(html).toContain('20:15');
    expect(html).toContain('20:30');
    expect(html).toContain('aria-live="polite"');
  });

  it('renders nothing without a change payload', () => {
    expect(renderToStaticMarkup(createElement(SilentFlashAnnouncement, { change: null }))).toBe('');
  });

  it('defines a 4 s three-pulse glow with a reduced-motion fallback', () => {
    const css = read('src/index.css');
    expect(css).toContain('@keyframes silent-flash-glow');
    expect(css).toContain('animation: silent-flash-glow 4s ease-in-out 1;');
    expect(css).toContain('.current-step-flash .timeline-focus-current');
    expect(css).toContain('rgb(245 158 11 / 0.75)');

    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)', css.indexOf('silent-flash-glow')));
    expect(reduced).toContain('animation: none');
    expect(reduced).toContain('rgb(245 158 11 / 0.7)');
  });
});
