import { useEffect } from 'react';
import { resolveNowPlaying } from '../lib/nowPlaying.js';

function useWakeLock(active) {
  useEffect(() => {
    if (
      !active ||
      typeof navigator === 'undefined' ||
      typeof navigator.wakeLock?.request !== 'function'
    ) {
      return undefined;
    }

    let cancelled = false;
    let sentinel = null;

    const acquire = async () => {
      try {
        const next = await navigator.wakeLock.request('screen');
        if (cancelled) {
          await next.release?.();
          return;
        }
        sentinel = next;
      } catch {
        // Battery saver or browser policy may reject the request.
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      sentinel?.release?.();
    };
  }, [active]);
}

// VIP-only, low-distraction now-playing display. The parent gates `enabled` by
// service package; Standard never receives the entry point.
export default function DjNowPlayingOverlay({
  enabled = false,
  open = false,
  onClose = () => {},
  activeEntry = null,
  nextEntry = null,
  keySongs = [],
}) {
  useWakeLock(enabled && open);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!enabled || !open) return null;

  const view = resolveNowPlaying({ activeEntry, nextEntry, keySongs });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dj-now-playing-title"
      className="fixed inset-0 z-[80] overflow-y-auto bg-black text-on-accent"
    >
      <div className="flex min-h-full flex-col p-5 sm:p-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="font-heading text-[10px] font-semibold uppercase tracking-[0.3em] text-brand-soft">
              VIP fullscreen now playing
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-on-accent/60">
              Read-only · live state follows the MC
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line-strong bg-raised px-4 py-2 text-xs font-bold text-ink transition hover:bg-line"
          >
            Close
          </button>
        </header>

        <main className="flex flex-1 flex-col justify-center py-8">
          <div className="font-heading text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
            Now playing
          </div>
          <h1
            id="dj-now-playing-title"
            className="mt-2 max-w-6xl font-heading text-4xl font-bold leading-tight text-on-accent sm:text-6xl xl:text-7xl"
          >
            {view.title ?? 'Waiting for the live step'}
          </h1>
          {view.artist ? (
            <div className="mt-2 text-xl text-on-accent/80 sm:text-3xl">{view.artist}</div>
          ) : null}
          {view.stepTitle && view.stepTitle !== view.title ? (
            <div className="mt-2 font-mono text-sm text-on-accent/60">{view.stepTitle}</div>
          ) : null}
          {view.track && view.track !== view.title ? (
            <div className="mt-1 font-mono text-sm text-on-accent/70">▶ {view.track}</div>
          ) : null}

          {view.cues.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {view.cues.map((cue) => (
                <span
                  key={cue.key}
                  className="rounded-lg border border-brand-strong bg-brand/30 px-3 py-1.5 font-mono text-lg font-bold text-brand-tint"
                >
                  {cue.label}
                </span>
              ))}
            </div>
          ) : null}

          {view.cutoff ? (
            <div className="mt-5 inline-flex max-w-xl flex-col rounded-xl border border-alert/70 bg-alert/20 px-4 py-3">
              <span className="font-heading text-[10px] font-bold uppercase tracking-[0.25em] text-alert-soft">
                Hard cutoff
              </span>
              <span className="mt-1 font-mono text-3xl font-bold text-alert-tint">{view.cutoff}</span>
            </div>
          ) : null}

          <div className="mt-8 border-t border-line pt-5">
            <div className="font-heading text-[10px] font-semibold uppercase tracking-[0.25em] text-on-accent/60">
              Next
            </div>
            <div className="mt-1 font-heading text-2xl font-semibold text-on-accent/90 sm:text-3xl">
              {view.nextTitle ?? 'No next track'}
            </div>
            {view.nextStepTitle || view.nextStart ? (
              <div className="mt-1 font-mono text-xs text-on-accent/60">
                {view.nextStart ? `${view.nextStart} · ` : ''}
                {view.nextStepTitle ?? ''}
              </div>
            ) : null}
          </div>
        </main>

        <footer className="font-mono text-[10px] uppercase tracking-widest text-on-accent/60">
          VIP fullscreen · no step controls · screen wake lock when supported
        </footer>
      </div>
    </div>
  );
}
