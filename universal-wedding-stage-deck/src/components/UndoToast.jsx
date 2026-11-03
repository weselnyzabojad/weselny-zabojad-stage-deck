import { useEffect, useRef } from 'react';

// Five-second undo toast for destructive stage commands (P0.7).
export default function UndoToast({ toast, onUndo, onDismiss, durationMs = 5000 }) {
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!toast?.id) return undefined;
    const timer = window.setTimeout(() => dismissRef.current?.(), durationMs);
    return () => window.clearTimeout(timer);
  }, [toast?.id, durationMs]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 z-[60] w-[min(92vw,26rem)] -translate-x-1/2 overflow-hidden rounded-xl border border-line-strong bg-card shadow-2xl"
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="min-w-0">
          <div className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
            Action applied
          </div>
          <div className="truncate text-xs text-slate-200">{toast.label}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onUndo}
            className="rounded border border-brand-strong bg-brand px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-brand-hover"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="rounded border border-line bg-raised px-2 py-1 text-[11px] text-slate-300 transition hover:bg-line"
          >
            ✕
          </button>
        </div>
      </div>
      <div
        key={toast.id}
        aria-hidden="true"
        className="undo-toast-progress h-0.5 bg-brand"
        style={{ animationDuration: `${durationMs}ms` }}
      />
    </div>
  );
}
