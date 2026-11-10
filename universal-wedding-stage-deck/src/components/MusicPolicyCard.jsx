import { useI18n } from '../i18n/useI18n';
import { formatDuration } from '../lib/eventTime.js';
import DiscoPoloBadge from './DiscoPoloBadge';

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
    chip: 'border-line-strong bg-raised text-muted',
    dot: 'bg-slate-500',
  },
  disabled: {
    chip: 'border-alert/60 bg-alert/20 text-alert-tint',
    dot: 'bg-alert',
  },
  unknown: {
    chip: 'border-line-strong bg-raised text-muted',
    dot: 'bg-slate-500',
  },
};

function statusLabel(status, t) {
  if (!status) return '';
  if (status.key === 'disabled') return t('music.status.disabled');
  if (status.key === 'upcoming') return t('music.status.upcoming', { time: status.start });
  if (status.key === 'closed') return t('music.status.closed', { time: status.end });
  if (status.key === 'open' && status.end) {
    return t('music.status.openUntil', { time: status.end });
  }
  if (status.key === 'open') return t('music.status.open');
  if (status.key === 'unknown') return t('music.status.window', { start: status.start, end: status.end });
  return '';
}

function statusDetail(status, t) {
  if (!status) return null;
  if (status.key === 'disabled') return t('music.detail.disabled');
  if (status.key === 'open' && !status.end) return t('music.detail.noWindow');
  if (status.key === 'closed') return t('music.detail.ended');
  if (status.key === 'unknown') return t('music.detail.window');
  if (status.countdownSec == null) return null;
  const duration = formatDuration(status.countdownSec);
  return status.key === 'upcoming'
    ? t('music.detail.in', { duration })
    : t('music.detail.left', { duration });
}

function StatusChip({ status, compact, t }) {
  if (!status) return null;
  const meta = STATUS_META[status.key] ?? STATUS_META.unknown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono font-bold ${
        compact ? 'text-[9px]' : 'text-[10px]'
      } ${meta.chip}`}
      title={statusDetail(status, t) ?? undefined}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {statusLabel(status, t)}
    </span>
  );
}

function CleanChip({ cleanVersions, t }) {
  if (cleanVersions === null) {
    return (
      <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 text-muted">
        ✨ {t('music.clean.missing')}
      </span>
    );
  }
  return cleanVersions ? (
    <span className="rounded border border-emerald-800 bg-emerald-950/60 px-1.5 py-0.5 font-semibold text-emerald-300">
      ✨ {t('music.clean.on')}
    </span>
  ) : (
    <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 text-muted">
      ✨ {t('music.clean.off')}
    </span>
  );
}

// Music policy card for the DJ Booth (full) and MC / Pocket (compact).
export default function MusicPolicyCard({ policy, compact = false }) {
  const { t } = useI18n();
  if (!policy?.hasData) return null;

  const { mustPlay, doNotPlay, mainSongs = [], requestStatus, cleanVersions, discoPoloPolicy } = policy;

  if (compact) {
    return (
      <section
        aria-label={t('music.title')}
        className="rounded-xl border border-line bg-card p-3 shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-heading text-[10px] font-semibold uppercase tracking-widest text-brand-soft">
            🎵 {t('music.title')}
          </span>
          <StatusChip status={requestStatus} compact t={t} />
        </div>

        <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-ink">
          <DiscoPoloBadge value={discoPoloPolicy} compact />
          <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5">
            ✅ {t('music.mustPlay.count', { count: mustPlay.length })}
          </span>
          <span className="rounded border border-brand-strong/50 bg-brand/10 px-1.5 py-0.5 text-brand-tint">
            ⭐ {t('music.mainSongs.count', { count: mainSongs.length })}
          </span>
          <span className="rounded border border-alert/50 bg-alert/15 px-1.5 py-0.5 text-alert-tint">
            🚫 {t('music.doNotPlay.count', { count: doNotPlay.length })}
          </span>
          <CleanChip cleanVersions={cleanVersions} t={t} />
        </div>

        {mainSongs.length > 0 ? (
          <p
            className="mt-1.5 truncate text-[10px] text-muted"
            title={mainSongs
              .map((item) => `${item.stepTitle}: ${item.track ?? t('music.missing')}`)
              .join(' · ')}
          >
            ⭐{' '}
            {mainSongs
              .map((item) => item.track ?? `${item.stepTitle} — ${t('music.missing')}`)
              .join(' · ')}
          </p>
        ) : null}

        {doNotPlay.length > 0 ? (
          <p
            className="mt-1.5 truncate text-[10px] text-muted"
            title={doNotPlay.map((item) => item.track).join(' · ')}
          >
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
          className="font-heading text-xs font-bold uppercase tracking-widest text-ink"
        >
          🎵 {t('music.title')}
        </h2>
        <StatusChip status={requestStatus} t={t} />
      </div>

      {statusDetail(requestStatus, t) ? (
        <p className="mt-1 text-[10px] text-muted">
          {statusDetail(requestStatus, t)}
          {policy.requestWindow
            ? ` · ${t('music.windowRange', {
                start: policy.requestWindow.start,
                end: policy.requestWindow.end,
              })}`
            : ''}
        </p>
      ) : null}

      <div className="mt-2">
        <DiscoPoloBadge value={discoPoloPolicy} />
      </div>

      {mainSongs.length > 0 ? (
        <div className="mt-3">
          <h3 className="font-heading text-[10px] font-semibold uppercase tracking-widest text-brand-tint">
            ⭐ {t('music.mainSongs.title', { count: mainSongs.length })}
          </h3>
          <ul className="mt-1.5 space-y-1.5">
            {mainSongs.map((item) => (
              <li
                key={item.id}
                className="rounded border border-brand-strong/40 bg-brand/10 p-2"
              >
                <div className="font-heading text-[10px] font-semibold uppercase tracking-widest text-brand-soft">
                  {item.stepTitle}
                </div>
                {item.missing ? (
                  <p className="mt-0.5 text-[11px] font-semibold text-amber-200">
                    {t('music.mainSongMissing')}
                  </p>
                ) : (
                  <div className="mt-0.5 text-[11px] text-ink">
                    <strong className="text-ink">{item.title ?? item.artist}</strong>
                    {item.title && item.artist ? (
                      <span className="text-muted"> — {item.artist}</span>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {mustPlay.length > 0 ? (
        <div className="mt-3">
          <h3 className="font-heading text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
            ✅ {t('music.mustPlay.title', { count: mustPlay.length })}
          </h3>
          <ul className="mt-1.5 space-y-1.5">
            {mustPlay.map((item) => (
              <li key={item.id} className="rounded border border-line bg-page/70 p-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-heading text-xs font-semibold text-ink">
                    {item.track}
                  </span>
                  {item.linked ? (
                    <span
                      title={t('music.keySong.tooltip')}
                      className="rounded border border-brand-strong bg-brand/30 px-1.5 py-0.5 font-mono text-[9px] text-brand-tint"
                    >
                      🎵 {t('music.keySong.label')}
                    </span>
                  ) : null}
                </div>
                {item.note ? (
                  <p className="mt-0.5 text-[10px] text-muted">{item.note}</p>
                ) : null}
                {item.conflict ? (
                  <p className="mt-0.5 text-[9px] text-amber-200">
                    {t('music.keySong.conflict')}
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
            🚫 {t('music.doNotPlay.title', { count: doNotPlay.length })}
          </h3>
          <ul className="mt-1.5 space-y-1.5">
            {doNotPlay.map((item) => (
              <li
                key={item.key}
                className="rounded border border-alert/40 bg-alert/10 p-2"
              >
                <div className="font-heading text-xs font-semibold text-alert-tint">
                  {item.track}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
        <CleanChip cleanVersions={cleanVersions} t={t} />
      </div>
    </section>
  );
}
