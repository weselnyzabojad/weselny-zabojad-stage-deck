import { formatFirstDanceSeconds, resolveFirstDance } from '../lib/firstDance.js';

// MC gets the guest-facing explanation; DJ VIP gets the exact start/stop
// timing. No other role sees First Dance timing.
export default function FirstDanceCueCard({ step, audience = 'mc' }) {
  const dance = resolveFirstDance(step);
  if (!dance.mode) return null;

  if (audience === 'mc') {
    return (
      <div className="rounded-lg border border-brand-strong/50 bg-brand/10 p-2.5 text-[11px] text-brand-tint">
        <div className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
          💃 First Dance · {dance.meta.label}
        </div>
        <p className="mt-0.5 text-slate-200">{dance.meta.mcExplanation}</p>
        {dance.notes ? (
          <p className="mt-0.5 text-[10px] text-slate-400">{dance.notes}</p>
        ) : null}
      </div>
    );
  }

  if (audience !== 'dj-vip') return null;

  const start = formatFirstDanceSeconds(dance.startAtSec);
  const stop = formatFirstDanceSeconds(dance.stopAfterSec);

  return (
    <div className="rounded-lg border border-brand-strong/50 bg-brand/10 p-2.5 text-[11px] text-brand-tint">
      <div className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
        💃 First Dance · {dance.meta.label}
      </div>
      <div className="mt-1 flex flex-wrap gap-2 font-mono text-[10px]">
        <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 text-white">
          Start: {start ?? '—'}
        </span>
        <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 text-white">
          Stop after: {stop ?? '—'}
        </span>
      </div>
      {dance.notes ? (
        <p className="mt-0.5 text-[10px] text-slate-400">{dance.notes}</p>
      ) : null}
    </div>
  );
}
