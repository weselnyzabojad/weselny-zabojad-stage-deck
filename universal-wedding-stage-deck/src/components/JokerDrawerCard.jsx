// Blocks removed from the active timeline by "Defer to Joker Drawer". They keep
// their original order and can be restored with one tap if time opens up.
export default function JokerDrawerCard({ steps = [], onRestore }) {
  if (steps.length === 0) return null;

  return (
    <section className="rounded-xl border border-[#3b5bdb]/60 bg-[#0b132b]/95 p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-white">
          🃏 Joker Drawer ({steps.length})
        </h2>
        <span className="rounded border border-[#3b5bdb]/60 bg-[#002395]/30 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-[#b8c6ff]">
          DEFERRED
        </span>
      </div>

      <div className="mt-2 space-y-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-[#1c2a52] bg-[#070b19]/70 p-2.5"
          >
            <div className="min-w-0">
              <div className="truncate font-heading text-xs font-semibold text-white">
                {step.title}
              </div>
              <div className="font-mono text-[10px] text-slate-400">
                {step.time} · {step.durationMin} min
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRestore(step.id)}
              title={`Restore ${step.title} to the active timeline`}
              className="shrink-0 rounded border border-[#3b5bdb] bg-[#002395]/40 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-[#002395]/70"
            >
              Restore
            </button>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[10px] leading-snug text-slate-500">
        Deferred blocks are outside the active timeline; restore one if time opens up.
      </p>
    </section>
  );
}
