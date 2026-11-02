import ModalShell from './ModalShell';

const TONES = {
  critical: {
    card: 'border-[#ED2939]/50 bg-[#ED2939]/10',
    icon: 'border-[#ED2939]/60 bg-[#ED2939]/20 text-[#ff808a]'
  },
  celebrate: {
    card: 'border-amber-700/60 bg-amber-950/40',
    icon: 'border-amber-700 bg-amber-900/40 text-amber-300'
  },
  care: {
    card: 'border-cyan-800 bg-cyan-950/40',
    icon: 'border-cyan-700 bg-cyan-900/40 text-cyan-300'
  }
};

// Confidential family notes behind the red VIP Radar button.
export default function VipAlertsModal({ open, alerts = [], onClose }) {
  return (
    <ModalShell open={open} onClose={onClose} labelledBy="vip-title" size="panel">
      <header className="border-b border-[#ED2939]/30 bg-[#1a0b12] px-5 py-4 pr-16">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ED2939] opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#ED2939]" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#ff808a]">
            Confidential · MC / host eyes only
          </span>
        </div>
        <h2 id="vip-title" className="mt-1 font-heading text-xl font-bold text-white">
          VIP & Tactful Alerts
        </h2>
        <p className="text-xs text-slate-400">{alerts.length} active notes for this wedding.</p>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {alerts.map((alert, index) => {
          const tone = TONES[alert.tone] ?? TONES.care;
          return (
            <article key={alert.id ?? index} className={`rounded-xl border p-3.5 ${tone.card}`}>
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg ${tone.icon}`}
                >
                  {alert.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-sm font-bold text-white">{alert.title}</h3>
                    <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-slate-400">
                      {alert.tag}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-snug text-slate-300">{alert.detail}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-[#1c2a52] bg-[#0b132b] px-4 py-3">
        <span className="font-mono text-[10px] text-slate-500">Never shown on the DJ screen.</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[#ED2939]/50 bg-[#ED2939]/20 px-4 py-2 font-heading text-xs font-bold text-[#ff8080] transition hover:bg-[#ED2939]/30"
        >
          Got it — close
        </button>
      </footer>
    </ModalShell>
  );
}
