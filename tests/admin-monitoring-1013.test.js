import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HEALTH_POLL_INTERVAL_MS,
  startHealthPolling,
} from '../src/admin/adminHealthPolling.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function fakeDocument(initial = 'visible') {
  const listeners = new Map();
  return {
    visibilityState: initial,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type, handler) {
      if (listeners.get(type) === handler) listeners.delete(type);
    },
    dispatch(type) {
      listeners.get(type)?.();
    },
    has(type) {
      return listeners.has(type);
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('issue #1013 admin monitoring top bar', () => {
  it('renders the compact strip with per-provider pills and a detail drawer', () => {
    const bar = read('src/admin/AdminHealthBar.jsx');
    expect(bar).toContain('aria-label="Service monitoring"');
    expect(bar).toContain('providers.map((provider)');
    expect(bar).toContain('healthPillCode');
    expect(bar).toContain('healthPillTone');
    expect(bar).toContain('formatCheckedAt(selectedProvider.checkedAt)');
    expect(bar).toContain('selectedProvider.detail');
    expect(bar).toContain('id="admin-health-detail"');
    expect(bar).toContain('Retry all');
    expect(bar).not.toContain('role="dialog"');
    expect(bar).not.toContain('sm:grid-cols-2 xl:grid-cols-3');
  });

  it('uses 60s visibility-aware polling', () => {
    expect(HEALTH_POLL_INTERVAL_MS).toBe(60_000);
    const bar = read('src/admin/AdminHealthBar.jsx');
    expect(bar).toContain('startHealthPolling');
  });

  it('polls only while visible and stops cleanly', async () => {
    vi.useFakeTimers();
    const doc = fakeDocument('visible');
    let runs = 0;
    const poll = startHealthPolling({
      run: async () => {
        runs += 1;
      },
      intervalMs: 1000,
      doc,
    });

    expect(doc.has('visibilitychange')).toBe(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(runs).toBe(1);

    doc.visibilityState = 'hidden';
    await vi.advanceTimersByTimeAsync(2000);
    expect(runs).toBe(1);

    doc.visibilityState = 'visible';
    doc.dispatch('visibilitychange');
    await vi.advanceTimersByTimeAsync(0);
    expect(runs).toBe(2);

    poll.stop();
    expect(doc.has('visibilitychange')).toBe(false);
    await vi.advanceTimersByTimeAsync(2000);
    expect(runs).toBe(2);
  });

  it('never overlaps requests', async () => {
    vi.useFakeTimers();
    const doc = fakeDocument('visible');
    let started = 0;
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const poll = startHealthPolling({
      run: async () => {
        started += 1;
        await gate;
      },
      intervalMs: 1000,
      doc,
    });

    void poll.run();
    void poll.run();
    await vi.advanceTimersByTimeAsync(2000);
    expect(started).toBe(1);
    release();
    await vi.advanceTimersByTimeAsync(0);
    poll.stop();
  });
});
