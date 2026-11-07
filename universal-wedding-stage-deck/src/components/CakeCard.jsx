const STATE_CHIPS = {
  done: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
  active: 'border-brand-strong bg-brand/40 text-brand-tint animate-pulse',
  next: 'border-amber-800 bg-amber-950/60 text-amber-200',
  planned: 'border-line-strong bg-raised text-slate-400',
};

const STATE_LABELS = {
  done: 'DONE',
  active: 'ON AIR',
  next: 'NEXT',
  planned: 'PLANNED',
};

function SparklersChip({ sparklers }) {
  if (sparklers === true) {
    return (
      <span className="rounded border border-amber-600/70 bg-amber-950/60 px-1.5 py-0.5 font-semibold text-amber-200">
        ✨ Sparklers ON
      </span>
    );
  }
  if (sparklers === false) {
    return (
      <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 text-slate-400">
        ✨ Sparklers OFF
      </span>
    );
  }
  return (
    <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 text-slate-500">
      ✨ Sparklers —
    </span>
  );
}

function SyncNote({ cake, compact }) {
  if (cake.songConflict) {
    return (
      <p
        className={`rounded border border-amber-800 bg-amber-950/60 px-1.5 py-1 text-amber-200 ${
          compact ? 'mt-1 text-[9px]' : 'mt-1 text-[10px]'
        }`}
      >
        `cake.cuttingSong` differs from the Key Songs entry — using the Key Songs song.
      </p>
    );
  }

  if (cake.songSource === 'importantSongs') {
    return (
      <p className={compact ? 'text-[9px] text-slate-500' : 'text-[10px] text-slate-500'}>
        🔗 Synced with the DJ Key Songs card
      </p>
    );
  }

  return null;
}

// Cake protocol card (TODO 6). Shared by the MC dashboard and Pocket Remote.
// `cake` comes from `resolveCakeProtocol`, which prefers the CAKE entry in
// `musicPolicy.importantSongs[]` so this card and the Key Songs card agree.
export default function CakeCard({ cake, compact = false }) {
  if (!cake?.hasData) return null;

  const song = cake.song || 'Song TBC';
  const hasState = Boolean(cake.stepId);

  if (compact) {
    return (
      <section
        aria-label="Cake protocol"
        className="rounded-xl border border-amber-700/50 bg-card p-3 shadow-lg"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-heading text-[10px] font-semibold uppercase tracking-widest text-amber-200">
            🎂 Cake
          </span>
        </div>
        <div className="mt-1 font-heading text-sm font-semibold leading-tight text-white">
          {song}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
          <SparklersChip sparklers={cake.sparklers} />
          {cake.photographerCue ? (
            <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 text-slate-300">
              📷 {cake.photographerCue}
            </span>
          ) : null}
          {hasState ? (
            <span
              className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold ${STATE_CHIPS[cake.state]}`}
            >
              {STATE_LABELS[cake.state]}
            </span>
          ) : null}
        </div>
        <SyncNote cake={cake} compact />
      </section>
    );
  }

  return (
    <section
      aria-labelledby="cake-protocol-title"
      className="rounded-xl border border-amber-700/50 bg-card p-4 shadow-lg"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="cake-protocol-title"
          className="font-heading text-xs font-bold uppercase tracking-widest text-amber-200"
        >
          🎂 Cake protocol
        </h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {hasState ? (
            <span
              className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold ${STATE_CHIPS[cake.state]}`}
            >
              {STATE_LABELS[cake.state]}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2 font-heading text-sm font-semibold leading-tight text-white">
        {song}
      </div>
      <SyncNote cake={cake} />

      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
        <SparklersChip sparklers={cake.sparklers} />
        {cake.photographerCue ? (
          <span
            title={cake.photographerCue}
            className="rounded border border-line-strong bg-raised px-1.5 py-0.5 text-slate-300"
          >
            📷 {cake.photographerCue}
          </span>
        ) : (
          <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 text-slate-500">
            📷 Photographer cue —
          </span>
        )}
      </div>
    </section>
  );
}
