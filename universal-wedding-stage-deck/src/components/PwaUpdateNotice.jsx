// Presentational PWA update notice (issue #81). The stateful container lives in
// PwaUpdatePrompt.jsx; keeping the view separate makes the prompt testable.

export default function PwaUpdateNotice({
  needRefresh = false,
  blockedReason = null,
  checking = false,
  onReload,
  onLater,
  onCheck,
}) {
  if (needRefresh) {
    const blocked = Boolean(blockedReason);
    return (
      <div
        role="alertdialog"
        aria-live="assertive"
        aria-label="Deck update available"
        className="fixed bottom-4 left-1/2 z-[100] w-[min(92vw,30rem)] -translate-x-1/2 rounded-xl border border-brand-strong bg-card p-4 text-slate-100 shadow-2xl"
      >
        <div className="flex items-start gap-1.5">
          <span aria-hidden="true" className="text-lg leading-none">
            ⬆️
          </span>
          <div className="min-w-0">
            <h2 className="font-heading text-sm font-bold text-white">Update available</h2>
            <p className="mt-1 text-xs text-slate-400">
              A new deck version is ready. Reload when the stage is safe.
            </p>
            {blocked ? (
              <p role="status" className="mt-2 rounded border border-amber-800 bg-amber-950/70 px-2 py-1 text-[11px] text-amber-200">
                {blockedReason}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onLater}
            className="rounded border border-line-strong bg-raised px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-line"
          >
            Later
          </button>
          <button
            type="button"
            onClick={onReload}
            disabled={blocked}
            className="rounded border border-brand-strong bg-brand/40 px-3 py-1.5 text-xs font-semibold text-brand-tint transition hover:bg-brand/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reload now
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onCheck}
      title="Check for updates"
      aria-label={checking ? 'Checking for updates' : 'Check for updates'}
      className="fixed bottom-3 right-3 z-[90] rounded-full border border-line-strong bg-card/90 px-2.5 py-1.5 text-[10px] font-semibold text-slate-300 shadow-lg backdrop-blur transition hover:bg-raised hover:text-white"
    >
      <span aria-hidden="true">↻</span>{' '}
      <span className="hidden sm:inline">{checking ? 'Checking…' : 'Check for updates'}</span>
    </button>
  );
}
