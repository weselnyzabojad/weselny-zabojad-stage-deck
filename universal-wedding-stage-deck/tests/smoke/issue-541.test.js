import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #541 no automatic full-page reloads', () => {
  it('routes service-worker activation through an explicit per-tab request', () => {
    const prompt = read('src/components/PwaUpdatePrompt.jsx');

    // The prompt opts into the library's onNeedReload hook instead of letting
    // `registerSW` reload the document unconditionally.
    expect(prompt).toContain('onNeedReload');

    // There is exactly one reload site and it is behind the request guard.
    expect(prompt.match(/window\.location\.reload\(\)/g)).toHaveLength(1);
    const guard = prompt.indexOf('!reloadRequestedRef.current');
    const reload = prompt.indexOf('window.location.reload()');
    expect(guard).toBeGreaterThan(-1);
    expect(reload).toBeGreaterThan(guard);

    // "Reload now" must mark this tab before handing control to the worker.
    const setFlag = prompt.indexOf('reloadRequestedRef.current = true');
    const updateCall = prompt.indexOf('updateSWRef.current?.(true)');
    expect(setFlag).toBeGreaterThan(-1);
    expect(updateCall).toBeGreaterThan(setFlag);
  });

  it('keeps PWA updates deferred instead of auto-activating', () => {
    const config = read('vite.config.js');
    expect(config).toContain("registerType: 'prompt'");
    expect(config).not.toContain("registerType: 'autoUpdate'");
    expect(config).not.toContain('autoUpdate');
  });

  it('only reloads the document from the error-boundary button', () => {
    const boundary = read('src/components/AppErrorBoundary.jsx');
    expect(boundary.match(/window\.location\.reload\(\)/g)).toHaveLength(1);

    const safeReload = boundary.slice(
      boundary.indexOf('safeReload ='),
      boundary.indexOf('copyDiagnostics ='),
    );
    expect(safeReload).toContain('window.location.reload()');
    // componentDidCatch/componentDidUpdate must never trigger a reload.
    expect(boundary.slice(0, boundary.indexOf('safeReload ='))).not.toContain(
      'window.location.reload',
    );
  });

  it('does not remount StageDeck on incidental identity changes', () => {
    const app = read('src/App.jsx');
    expect(app).toContain('<StageDeck');
    expect(app).not.toContain('<StageDeck key=');

    // An unchanged cartridge revision updates freshness only; it must keep the
    // current cartridge object so StageDeck and the live state are not reset.
    const hook = read('src/hooks/usePublishedCartridge.js');
    const unchanged = hook.slice(
      hook.indexOf('if (result.unchangedRevision)'),
      hook.indexOf('currentSnapshot = {'),
    );
    expect(unchanged).toContain('setState');
    expect(unchanged).not.toContain('cartridge:');
  });

  it('leaves the current UI untouched when an update check fails', () => {
    const prompt = read('src/components/PwaUpdatePrompt.jsx');
    expect(prompt).toContain('A failed background check must never interrupt the live UI');
    expect(prompt).toContain('a failed check is not a stage failure');
  });

  it('keeps the legacy admin redirect one-shot', () => {
    const main = read('src/main.jsx');
    expect(main.match(/window\.location\.replace/g)).toHaveLength(1);
    expect(main).toContain('isLegacyAdminPath');
  });
});
