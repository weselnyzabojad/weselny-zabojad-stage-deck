const STATUS_META = {
  shorten: {
    label: 'LATE · SHORTEN',
    chip: 'border-amber-700 bg-amber-950/60 text-amber-200',
    border: 'border-amber-800/70',
  },
  extend: {
    label: 'AHEAD · EXTEND',
    chip: 'border-cyan-800 bg-cyan-950/60 text-cyan-200',
    border: 'border-cyan-900/70',
  },
  'extend-and-joker': {
    label: 'AHEAD · EXTEND + JOKER',
    chip: 'border-amber-700 bg-amber-950/60 text-amber-200',
    border: 'border-amber-800/70',
  },
  joker: {
    label: 'AHEAD · JOKER',
    chip: 'border-amber-700 bg-amber-950/60 text-amber-200',
    border: 'border-amber-800/70',
  },
  blocked: {
    label: 'NO FLEX',
    chip: 'border-alert/60 bg-alert/20 text-alert-soft',
    border: 'border-alert/50',
  },
  ontime: {
    label: 'ON TIME',
    chip: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
    border: 'border-emerald-900/70',
  },
  unknown: {
    label: 'NO DRIFT',
    chip: 'border-line-strong bg-raised text-slate-300',
    border: 'border-line',
  },
  unavailable: {
    label: 'NO FLEX',
    chip: 'border-line-strong bg-raised text-slate-400',
    border: 'border-line',
  },
};

function rangeLabel(accordion) {
  if (accordion.mode === 'late') {
    return `Recovered ${accordion.recoveredMinutes}m of ${accordion.driftMinutes}m delay${
      accordion.remainingMinutes > 0 ? ` · ${accordion.remainingMinutes}m still late` : ''
    }`;
  }
  if (accordion.mode === 'ahead') {
    const lead = Math.abs(accordion.driftMinutes);
    return `Absorbed ${accordion.recoveredMinutes}m of ${lead}m lead${
      accordion.remainingMinutes > 0 ? ` · ${accordion.remainingMinutes}m still ahead` : ''
    }`;
  }
  return null;
}

// MC-side recommendation card for flexible BUFFER / dance blocks. This surfaces
// the plan only; applying the new duration is a one-tap action for issue #13.
export default function BufferAccordionCard({ accordion }) {
  if (!accordion) return null;

  const meta = STATUS_META[accordion.status] ?? STATUS_META.unknown;
  const totals = rangeLabel(accordion);
  const finishChanged =
    accordion.accordionProjectedFinish &&
    accordion.baselineProjectedFinish &&
    accordion.accordionProjectedFinish !== accordion.baselineProjectedFinish;

  return (
    <section
      role="status"
      aria-live="polite"
      className={`rounded-xl border bg-card/95 p-4 shadow-lg ${meta.border}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-white">
          🪗 Buffer Accordion
        </h2>
        <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider ${meta.chip}`}>
          {meta.label}
        </span>
      </div>

      <p className="mt-2 text-xs leading-snug text-slate-300">{accordion.message}</p>

      {accordion.items.length > 0 ? (
        <div className="mt-2 space-y-2">
          {accordion.items.map((item) => (
            <div
              key={item.stepId}
              className="rounded-lg border border-line bg-page/70 p-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-heading text-xs font-semibold text-white">
                    {item.isDanceBlock ? '💃 ' : '⏳ '}
                    {item.title}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                    {item.projectedStart ?? '—'} · {item.plannedDurationMin} →{' '}
                    {item.adjustedDurationMin} min
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                    item.deltaMinutes < 0
                      ? 'border-alert/60 bg-alert/20 text-alert-soft'
                      : 'border-cyan-800 bg-cyan-950/60 text-cyan-200'
                  }`}
                >
                  {item.deltaMinutes < 0
                    ? `−${Math.abs(item.deltaMinutes)}m`
                    : `+${item.deltaMinutes}m`}
                </span>
              </div>
              <div className="mt-1 font-mono text-[10px] text-slate-500">
                Ends {item.projectedEndBeforeAdjustment ?? '—'} →{' '}
                {item.projectedEndAfterAdjustment ?? '—'}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
        {totals ? <span className="font-mono text-slate-400">{totals}</span> : null}
        {finishChanged ? (
          <span className="font-mono text-slate-400">
            Finish {accordion.baselineProjectedFinish} → {accordion.accordionProjectedFinish}
          </span>
        ) : null}
        {accordion.suggestJoker ? (
          <span className="rounded border border-amber-700 bg-amber-950/60 px-1.5 py-0.5 font-heading font-semibold text-amber-200">
            🃏 Pull a Joker Game
          </span>
        ) : null}
      </div>
    </section>
  );
}
