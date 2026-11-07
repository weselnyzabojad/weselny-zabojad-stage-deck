// Twin task shown inside the active step when the mini-session hour is chosen.
// It never changes step planning, order or durations.
export default function MiniSessionTwinTask({
  time,
  durationMin = null,
  location = null,
  backupLocation = null,
}) {
  return (
    <section
      aria-label="Mini session twin task"
      className="rounded-lg border border-amber-700/60 bg-amber-950/30 p-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-[10px] font-bold uppercase tracking-widest text-amber-200">
          📸 Mini session
        </h3>
        <span className="rounded border border-amber-700/60 bg-amber-950/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-100">
          {time}
          {Number.isFinite(durationMin) ? ` · ${durationMin} min` : ''}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-slate-300">
        Take the newlyweds outside for private pictures.
      </p>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
        {location ? <span>Location: {location}</span> : null}
        {backupLocation ? <span>Backup: {backupLocation}</span> : null}
      </div>
    </section>
  );
}
