const STATUS_META = {
  open: {
    chip: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  upcoming: {
    chip: 'border-cyan-800 bg-cyan-950/60 text-cyan-200',
    dot: 'bg-cyan-300',
  },
  closed: {
    chip: 'border-line-strong bg-raised text-slate-400',
    dot: 'bg-slate-500',
  },
  disabled: {
    chip: 'border-alert/60 bg-alert/20 text-alert-tint',
    dot: 'bg-alert',
  },
  unknown: {
    chip: 'border-line-strong bg-raised text-slate-400',
    dot: 'bg-slate-500',
  },
};

function StatusChip({ status, compact }) {
  if (!status) return null;
  const meta = STATUS_META[status.key] ?? STATUS_META.unknown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono font-bold ${
        compact ? 'text-[9px]' : 'text-[10px]'
      } ${meta.chip}`}
      title={status.detail ?? undefined}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {status.label}
    </span>
  );
}

function CleanChip({ cleanVersions }) {
  if (cleanVersions === null) {
    return (
      <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 text-slate-500">
        ✨ Clean versions —
      </span>
    );
  }
  return cleanVersions ? (
    <span className="rounded border border-emerald-800 bg-emerald-950/60 px-1.5 py-0.5 font-semibold text-emerald-300">
      ✨ Clean versions ON
    </span>
  ) : (
    <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 text-slate-400">
      ✨ Clean versions OFF
    </span>
  );
}

// Music policy card for the DJ Booth (full) and MC / Pocket (compact).
export default function MusicPolicyCard({ policy, compact = false }) {
  if (!policy?.hasData) return null;

  const { mustPlay, doNotPlay, requestStatus, cleanVersions, licensing } = policy;

  if (compact) {
    return (
      <section
        aria-label="Music policy"
        className="rounded-xl border border-line bg-card p-3 shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-heading text-[10px] font-semibold uppercase tracking-widest text-brand-soft">
            🎵 Music policy
          </span>
          <StatusChip status={requestStatus} compact />
        </div>

        <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-slate-300">
          <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5">
            ✅ {mustPlay.length} must play
          </span>
          <span className="rounded border border-alert/50 bg-alert/15 px-1.5 py-0.5 text-alert-tint">
            🚫 {doNotPlay.length} do not play
          </span>
          <CleanChip cleanVersions={cleanVersions} />
        </div>

        {doNotPlay.length > 0 ? (
          <p className="mt-1.5 truncate text-[10px] text-slate-400" title={doNotPlay.map((item) => item.track).join(' · ')}>
            🚫 {doNotPlay.map((item) => item.track).join(' · ')}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section
      aria-labelledby="music-policy-title"
      className="rounded-xl border border-line bg-card/95 p-4 shadow-lg"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="music-policy-title"
          className="font-heading text-xs font-bold uppercase tracking-widest text-white"
        >
          🎵 Music policy
        </h2>
        <StatusChip status={requestStatus} />
      </div>

      {requestStatus?.detail ? (
        <p className="mt-1 text-[10px] text-slate-400">
          {requestStatus.detail}
          {policy.requestWindow
            ? ` · window ${policy.requestWindow.start}–${policy.requestWindow.end}`
            : ''}
        </p>
      ) : null}

      {mustPlay.length > 0 ? (
        <div className="mt-3">
          <h3 className="font-heading text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
            ✅ Must play ({mustPlay.length})
          </h3>
          <ul className="mt-1.5 space-y-1.5">
            {mustPlay.map((item) => (
              <li key={item.id} className="rounded border border-line bg-page/70 p-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-heading text-xs font-semibold text-white">
                    {item.track}
                  </span>
                  {item.linked ? (
                    <span
                      title="Linked to the DJ Key Songs card by id"
                      className="rounded border border-brand-strong bg-brand/30 px-1.5 py-0.5 font-mono text-[9px] text-brand-tint"
                    >
                      🎵 Key song
                    </span>
                  ) : null}
                </div>
                {item.note ? (
                  <p className="mt-0.5 text-[10px] text-slate-400">{item.note}</p>
                ) : null}
                {item.conflict ? (
                  <p className="mt-0.5 text-[9px] text-amber-200">
                    mustPlay track differs from the Key Songs entry — showing the Key Songs title.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {doNotPlay.length > 0 ? (
        <div className="mt-3">
          <h3 className="font-heading text-[10px] font-semibold uppercase tracking-widest text-alert-soft">
            🚫 Do not play ({doNotPlay.length})
          </h3>
          <ul className="mt-1.5 space-y-1.5">
            {doNotPlay.map((item) => (
              <li
                key={item.id}
                className="rounded border border-alert/40 bg-alert/10 p-2"
              >
                <div className="font-heading text-xs font-semibold text-alert-tint">
                  {item.track}
                </div>
                {item.reason ? (
                  <p className="mt-0.5 text-[10px] text-slate-400">{item.reason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
        <CleanChip cleanVersions={cleanVersions} />
        {licensing ? (
          <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 text-slate-300">
            📄 {licensing}
          </span>
        ) : null}
      </div>
    </section>
  );
}
