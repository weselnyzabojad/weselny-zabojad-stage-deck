import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PwaUpdateNotice from '../../src/components/PwaUpdateNotice.jsx';
import {
  clearReloadState,
  loadReloadState,
  saveReloadState,
} from '../../src/lib/reloadState.js';
import { resolvePwaReloadBlock } from '../../src/lib/pwaUpdate.js';

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}

describe('issue #81 deferred PWA update flow', () => {
  it('blocks reload while a step is live', () => {
    expect(
      resolvePwaReloadBlock({ activeStepId: 'step_01' }),
    ).toContain('A step is live');
  });

  it('blocks reload while a speech is live', () => {
    expect(
      resolvePwaReloadBlock({ activeSpeech: true }),
    ).toContain('A speech is live');
  });

  it('blocks reload while an overlay is open', () => {
    expect(
      resolvePwaReloadBlock({ overlay: 'teleprompter' }),
    ).toContain('Close the open panel');
  });

  it('allows reload when the stage is safe', () => {
    expect(resolvePwaReloadBlock({})).toBeNull();
  });

  it('saves and restores the overlay and scroll position across a reload', () => {
    const storage = fakeStorage();
    saveReloadState({ overlay: 'teleprompter', scrollY: 420, storage, now: 1_000 });
    expect(loadReloadState({ storage, now: 2_000 })).toEqual({
      overlay: 'teleprompter',
      scrollY: 420,
    });

    clearReloadState({ storage });
    expect(loadReloadState({ storage, now: 2_000 })).toBeNull();
  });

  it('ignores stale reload state', () => {
    const storage = fakeStorage();
    saveReloadState({ overlay: 'vip', scrollY: 12, storage, now: 1_000 });
    expect(loadReloadState({ storage, now: 1_000 + 6 * 60 * 1000 })).toBeNull();
  });

  it('renders the deferred update prompt and disables reload while blocked', () => {
    const html = renderToStaticMarkup(
      createElement(PwaUpdateNotice, {
        needRefresh: true,
        blockedReason: 'A step is live. Reload after the event or in a safe gap.',
        onReload: () => {},
        onLater: () => {},
        onCheck: () => {},
      }),
    );

    expect(html).toContain('Update available');
    expect(html).toContain('Reload now');
    expect(html).toContain('Later');
    expect(html).toContain('A step is live');
    expect(html).toContain('disabled');
  });

  it('renders the manual check action when no update is pending', () => {
    const html = renderToStaticMarkup(
      createElement(PwaUpdateNotice, {
        needRefresh: false,
        onReload: () => {},
        onLater: () => {},
        onCheck: () => {},
      }),
    );

    expect(html).toContain('Check for updates');
    expect(html).not.toContain('Update available');
  });
});
