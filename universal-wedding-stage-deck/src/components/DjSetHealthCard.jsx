import { buildDjSetHealth } from '../lib/djSetHealth.js';

const STATUS_META = {
  ready: {
    label: 'Ready offline',
    chip: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
  },
  attention: {
    label: 'Needs attention',
    chip: 'border-amber-800 bg-amber-950/60 text-amber-200',
  },
  critical: {
    label: 'Not ready',
    chip: 'border-alert/60 bg-alert/20 text-alert-tint',
  },
  empty: {
    label: 'No key songs',
    chip: 'border-line-strong bg-raised text-slate-400',
  },
};

const SOURCE_META = {
  cached: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
  backup: 'border-amber-800 bg-amber-950/60 text-amber-200',
  online: 'border-cyan-800 bg-cyan-950/60 text-cyan-200',
  missing: 'border-alert/60 bg-alert/20 text-alert-tint',
  unavailable: 'border-alert/60 bg-alert/20 text-alert-tint',
};

function SummaryChips({ health }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
      <span className="rounded border border-emerald-800 bg-emerald-950/60 px-1.5 py-0.5 text-emerald-300">
        {health.offlineReady}/{health.total} offline-ready
      </span>
      {health.backup > 0 ? (
        <span className="rounded border border-amber-800 bg-amber-950/60 px-1.5 py-0.5 text-amber-200">
          {health.backup} backup
        </span>
      ) : null}
      {health.online > 0 ? (
        <span className="rounded border border-cyan-800 bg-cyan-950/60 px-1.5 py-0.5 text-cyan-200">
          {health.online} online
        </span>
      ) : null}
      {health.criticalItems.length > 0 ? (
        <span className="rounded border border-alert/60 bg-alert/20 px-1.5 py-0.5 text-alert-tint">
          {health.criticalItems.length} not ready
        </span>
      ) : null}
    </div>
  );
}

function CompactHealth({ health }) {
  const meta = STATUS_META[health.status] ?? STATUS_META.attention;

  return (
    <section className="rounded-xl border border-line bg-card p-3 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-[10px] font-semibold uppercase tracking-widest text-brand-soft">
          📶 Offline set health
        </h2>
        <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold ${meta.chip}`}>
          {meta.label}
        </span>
      </div>

      <SummaryChips health={health} />

      {health.criticalItems.length > 0 ? (
        <ul className="mt-2 space-y-1 text-[10px] text-alert-soft">
          {health.criticalItems.map((item) => (
            <li key={item.id} className="truncate" title={`${item.title} — ${item.effective.label}`}>
              ⚠ {item.title} · {item.effective.label}
            </li>
          ))}
        </ul>
      ) : health.offlineReady < health.total ? (
        <p className="mt-2 text-[10px] text-amber-200">
          {health.total - health.offlineReady} song
          {health.total - health.offlineReady === 1 ? '' : 's'} rely on online or backup sources.
        </p>
      ) : (
        <p className="mt-2 text-[10px] text-emerald-300">
          All key songs are available locally.
        </p>
      )}
    </section>
  );
}

function DesktopHealth({ health }) {
  const meta = STATUS_META[health.status] ?? STATUS_META.attention;

  return (
    <section className="rounded-xl border border-line bg-card/95 p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-white">
            📶 Offline set health
          </h2>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Key-song sources only · no private links or MC data
          </p>
        </div>
        <span className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold ${meta.chip}`}>
          {meta.label}
        </span>
      </div>

      <SummaryChips health={health} />

      <ul className="mt-2.5 space-y-1.5">
        {health.items.map((item) => {
          const primaryTone = SOURCE_META[item.effective.key] ?? SOURCE_META.missing;
          return (
            <li key={item.id} className="rounded-lg border border-line bg-page/70 p-2 text-[11px]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-heading text-xs font-semibold text-white">
                    {item.title}
                  </div>
                  <div className="truncate text-[10px] text-slate-400">
                    {item.artist} · {item.moment}
                    {item.stepTitle ? ` · ${item.stepTitle}` : ''}
                  </div>
                </div>
                <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold ${primaryTone}`}>
                  {item.effective.label}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[9px] text-slate-500">
                <span>Primary: {item.primaryLabel || 'No source'}</span>
                <span>State: {item.primary.label}</span>
                {item.backup ? (
                  <span>
                    Backup: {item.backupLabel} · {item.backup.label}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// VIP-only card. The parent gates it by service package; Standard never renders
// this component.
export default function DjSetHealthCard({ wedding, timeline = [], compact = false }) {
  const health = buildDjSetHealth(wedding, timeline);
  if (health.total === 0) return null;

  return compact ? <CompactHealth health={health} /> : <DesktopHealth health={health} />;
}
