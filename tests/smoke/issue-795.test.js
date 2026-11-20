import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { captureAppError, initSentry } from '../../src/lib/sentry.js';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #795 report AppErrorBoundary crashes to Sentry', () => {
  it('does nothing before Sentry is initialised', () => {
    const sdk = { captureException: vi.fn() };
    expect(captureAppError({ error: new Error('boom'), scope: 'mc' }, sdk)).toBe(false);
    expect(sdk.captureException).not.toHaveBeenCalled();
  });

  it('captures once with identifiers only and no PII', () => {
    vi.stubGlobal('window', {});
    try {
      initSentry(
        { PROD: true, VITE_SENTRY_DSN: 'https://public@example.ingest.sentry.io/1' },
        { init: vi.fn() },
      );
      const sdk = { captureException: vi.fn() };
      const error = new Error('render exploded');
      const sent = captureAppError(
        {
          error,
          scope: 'speaker',
          role: 'speaker',
          weddingId: 'wedding-1',
          stepId: 'step_2',
          errorId: 'error-1',
        },
        sdk,
      );

      expect(sent).toBe(true);
      expect(sdk.captureException).toHaveBeenCalledTimes(1);
      const [captured, context] = sdk.captureException.mock.calls[0];
      expect(captured).toBe(error);
      expect(context.tags).toEqual({ scope: 'speaker' });
      expect(context.contexts.app).toEqual({
        role: 'speaker',
        weddingId: 'wedding-1',
        stepId: 'step_2',
        errorId: 'error-1',
      });
      expect(JSON.stringify(context)).not.toMatch(/title|location|pin|roomCode|speech/i);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('still never throws when the SDK fails', () => {
    const sdk = {
      captureException: vi.fn(() => {
        throw new Error('transport down');
      }),
    };
    expect(captureAppError({ error: new Error('x'), scope: 'app' }, sdk)).toBe(false);
  });

  it('keeps the existing fallback and local log in the boundary', () => {
    const boundary = read('src/components/AppErrorBoundary.jsx');
    expect(boundary).toContain('captureAppError({');
    expect(boundary.indexOf('recordError({')).toBeLessThan(boundary.indexOf('captureAppError({'));
    expect(boundary).toContain("t('error.title')");
    expect(boundary).toContain('loadErrorLog()');
    expect(boundary).toContain('formatErrorLog');
    expect(boundary).toContain('resetKey');
  });
});
