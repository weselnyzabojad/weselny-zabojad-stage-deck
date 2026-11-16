import { useEffect, useRef, useState } from 'react';
import { adjacentStepId } from '../lib/devPreview';
import { DEV_VIEW_ROLES } from '../lib/viewRoles';

// TEMPORARY development-only tool. This component is rendered only behind the
// build-time import.meta.env.DEV gate in StageDeck and must never ship in a
// production bundle. Remove with the dev view-switching capability before
// release.
const LABELS = {
  mc: 'MC',
  dj: 'DJ',
  dj_mark: 'DJ Mark',
  dj_szymoniak: 'DJ Szymoniak',
  dj_mc: 'DJ + MC',
  photo1: 'Photo 1',
  photo2: 'Photo 2',
  video: 'Camera',
  venue_manager: 'Venue',
  musician: 'Musician',
  speaker: 'Speaker',
  song_request: 'Song request',
};

export default function DevViewSwitcher({
  currentRole = 'mc',
  roles = DEV_VIEW_ROLES,
  onChange,
  previewEnabled = false,
  steps = [],
  currentStepId = null,
  onStepChange,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };

    const closeOnOutsideClick = (event) => {
      if (panelRef.current?.contains(event.target)) return;
      if (triggerRef.current?.contains(event.target)) return;
      setOpen(false);
    };

    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, [open]);

  if (!previewEnabled) return null;

  const currentIndex = steps.findIndex((step) => step.id === currentStepId);
  const currentStep = currentIndex >= 0 ? steps[currentIndex] : null;
  const previousStepId = adjacentStepId(steps, currentStepId, -1);
  const nextStepId = adjacentStepId(steps, currentStepId, 1);

  return (
    <aside
      data-testid="dev-view-switcher"
      className="fixed left-3 top-3 z-toast flex flex-col items-start gap-1.5 sm:bottom-3 sm:top-auto sm:flex-col-reverse"
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls="dev-view-switcher-panel"
        onClick={() => setOpen((value) => !value)}
        className="rounded-md border border-amber-500/70 bg-amber-950/95 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-200 shadow-lg transition hover:bg-amber-900/90"
      >
        DEV
      </button>

      {open ? (
        <section
          id="dev-view-switcher-panel"
          ref={panelRef}
          data-testid="dev-view-switcher-panel"
          aria-label="Development view switcher - not for production"
          className="max-h-[45dvh] w-[min(92vw,24rem)] overflow-y-auto rounded-xl border border-amber-500/70 bg-amber-950/95 p-2.5 text-amber-50 shadow-2xl"
        >
          <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-amber-300">
            DEV VIEW SWITCHER - not for production
          </div>
          <div
            role="group"
            aria-label="Development role view"
            className="mt-1.5 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap"
          >
            {roles.map((role) => {
              const active = role === currentRole;
              return (
                <button
                  key={role}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange?.(role)}
                  className={`min-h-9 rounded border px-2 py-1 font-mono text-[10px] font-bold transition ${
                    active
                      ? 'border-brand-strong bg-brand/50 text-ink'
                      : 'border-amber-500/50 bg-amber-900/60 text-amber-100 hover:bg-amber-800/70'
                  }`}
                >
                  {LABELS[role] ?? role}
                </button>
              );
            })}
          </div>
          {previewEnabled && steps.length > 0 ? (
            <div
              data-testid="dev-step-navigator"
              aria-label="Development step preview"
              className="mt-2 border-t border-amber-500/40 pt-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-amber-300">
                  DEV STEP PREVIEW
                </span>
                <span className="font-mono text-[9px] text-amber-200">
                  {currentStep ? `${currentIndex + 1}/${steps.length}` : `${steps.length} steps`}
                </span>
              </div>
              <div className="mt-1 flex items-stretch gap-1.5">
                <button
                  type="button"
                  aria-label="Previous step"
                  disabled={!previousStepId}
                  onClick={() => onStepChange?.(previousStepId)}
                  className="min-h-9 min-w-9 rounded border border-amber-500/50 bg-amber-900/60 px-2 font-mono text-[11px] font-bold text-amber-100 transition hover:bg-amber-800/70 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ‹
                </button>
                <select
                  aria-label="Development preview step"
                  value={currentStepId ?? ''}
                  onChange={(event) => onStepChange?.(event.target.value)}
                  className="min-h-9 min-w-0 flex-1 rounded border border-amber-500/50 bg-amber-900/70 px-2 font-mono text-[10px] text-amber-50"
                >
                  {!currentStep ? <option value="">Select step…</option> : null}
                  {steps.map((step, index) => (
                    <option key={step.id} value={step.id}>
                      {`${index + 1}. ${step.time ?? '--:--'} — ${step.title}`}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label="Next step"
                  disabled={!nextStepId}
                  onClick={() => onStepChange?.(nextStepId)}
                  className="min-h-9 min-w-9 rounded border border-amber-500/50 bg-amber-900/60 px-2 font-mono text-[11px] font-bold text-amber-100 transition hover:bg-amber-800/70 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ›
                </button>
              </div>
              {currentStep ? (
                <div className="mt-1 truncate font-mono text-[9px] text-amber-200">
                  {currentStep.title}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
}
