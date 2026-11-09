const TONES = {
  success: 'border-emerald-700 bg-emerald-950/90 text-emerald-100',
  error: 'border-alert/70 bg-alert/20 text-alert-soft',
  info: 'border-line-strong bg-raised text-ink',
};

export default function AdminToast({ toasts = [], onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-toast flex w-[min(92vw,24rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-xs shadow-2xl ${
            TONES[toast.tone] ?? TONES.info
          }`}
        >
          <span className="leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="rounded px-1 text-sm leading-none opacity-70 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
