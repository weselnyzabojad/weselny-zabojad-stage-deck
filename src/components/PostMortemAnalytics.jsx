import { useMemo } from 'react';
import { useI18n } from '../i18n/useI18n';
import { clockToMinutes } from '../lib/clockMath.js';
import { buildTimingComparison } from '../lib/timingAnalytics.js';
import ModalShell from './ModalShell';
import SocialExportStudio from './SocialExportStudio';

function addMinutes(clock, minutes) {
  const base = clockToMinutes(clock);
  if (base == null || !Number.isFinite(minutes)) return null;
  const total = ((base + Math.round(minutes)) % (24 * 60) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function minutesLabel(minutes) {
  const total = ((Math.round(minutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function deltaTone(status) {
  if (status === 'on-time') return 'border-emerald-700 bg-emerald-950/50 text-emerald-200';
  if (status === 'late') return 'border-red-800 bg-red-950/50 text-red-200';
  if (status === 'early') return 'border-sky-800 bg-sky-950/50 text-sky-200';
  return 'border-line bg-raised text-muted';
}

function Summary({ label, value }) {
  return (
    <div className="rounded-lg border border-line bg-card/70 px-2.5 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

export default function PostMortemAnalytics({
  open,
  onClose,
  steps = [],
  liveState = {},
  closureTime = null,
  wedding = null,
}) {
  const { t } = useI18n();
  const comparison = useMemo(
    () => buildTimingComparison(steps, liveState, { closureTime }),
    [closureTime, liveState, steps],
  );
  const rows = comparison.rows;
  const axisTimes = [];
  rows.forEach((row) => {
    const planned = clockToMinutes(row.plannedStart);
    const plannedEnd = clockToMinutes(row.plannedEnd);
    const actual = clockToMinutes(row.actualStart);
    const actualEnd = actual != null && Number.isFinite(row.actualDurationMin)
      ? actual + row.actualDurationMin
      : null;
    if (planned != null) axisTimes.push(planned);
    if (plannedEnd != null) axisTimes.push(plannedEnd);
    if (actual != null) axisTimes.push(actual);
    if (actualEnd != null) axisTimes.push(actualEnd);
  });
  const axisStart = axisTimes.length > 0 ? Math.min(...axisTimes) : 0;
  const axisEnd = axisTimes.length > 0 ? Math.max(...axisTimes) : 24 * 60;
  const axisSpan = Math.max(1, axisEnd - axisStart);
  const percent = (minutes, duration = 0) => {
    const left = Math.max(0, Math.min(100, ((minutes - axisStart) / axisSpan) * 100));
    const width = Math.max(0.8, Math.min(100 - left, (Math.max(0, duration) / axisSpan) * 100));
    return { left: `${left}%`, width: `${width}%` };
  };

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="postmortem-title" describedBy="postmortem-description" size="full">
      <div className="flex h-full min-h-0 flex-col">
        <header className="border-b border-line px-5 py-4 pr-16">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {t('postMortem.eyebrow')}
          </p>
          <h2 id="postmortem-title" className="mt-1 font-heading text-lg font-bold text-ink">
            {t('postMortem.title')}
          </h2>
          <p id="postmortem-description" className="mt-1 text-xs text-muted">
            {t('postMortem.description')}
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" data-testid="post-mortem-analytics">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Summary label={t('postMortem.summary.total')} value={comparison.summary.totalSteps} />
            <Summary label={t('postMortem.summary.onTime')} value={comparison.summary.onTime} />
            <Summary label={t('postMortem.summary.late')} value={comparison.summary.late} />
            <Summary label={t('postMortem.summary.early')} value={comparison.summary.early} />
            <Summary label={t('postMortem.summary.missing')} value={comparison.summary.missing} />
            <Summary label={t('postMortem.first')} value={comparison.summary.firstActual ?? '—'} />
            <Summary label={t('postMortem.last')} value={comparison.summary.lastActual ?? '—'} />
            <Summary
              label={t('postMortem.totalLateness')}
              value={t('postMortem.minutes', { minutes: comparison.summary.totalLateness })}
            />
          </div>

          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted">
            {t('postMortem.axis')} · {minutesLabel(axisStart)} → {minutesLabel(axisEnd)}
          </p>

          {rows.length === 0 || comparison.summary.measured === 0 ? (
            <p className="mt-4 text-sm text-muted">{t('postMortem.empty')}</p>
          ) : (
            <ol className="mt-2 space-y-2">
              {rows.map((row) => {
                const plannedStart = clockToMinutes(row.plannedStart);
                const actualStart = clockToMinutes(row.actualStart);
                const plannedBar =
                  plannedStart != null
                    ? percent(plannedStart, row.plannedDurationMin ?? 0)
                    : null;
                const actualBar =
                  actualStart != null
                    ? percent(actualStart, row.actualDurationMin ?? 0)
                    : null;
                const actualEnd =
                  actualStart != null && Number.isFinite(row.actualDurationMin)
                    ? addMinutes(row.actualStart, row.actualDurationMin)
                    : null;
                const deltaLabel =
                  row.status === 'missing'
                    ? t('postMortem.missing')
                    : row.deltaMinutes === 0
                      ? t('postMortem.onTimeDelta')
                      : `${row.deltaMinutes > 0 ? '+' : '−'}${Math.abs(row.deltaMinutes)} min`;
                return (
                  <li key={row.id ?? row.title} className="rounded-xl border border-line bg-card/50 p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-ink">{row.title ?? row.id ?? '—'}</div>
                        <div className="font-mono text-[10px] text-muted">
                          {t('postMortem.planned')} {row.plannedStart ?? '—'}–{row.plannedEnd ?? '—'}
                          {' · '}
                          {t('postMortem.actual')} {row.actualStart ?? '—'}
                          {actualEnd ? `–${actualEnd}` : ''}
                        </div>
                      </div>
                      <span className={`rounded border px-2 py-0.5 font-mono text-[10px] font-semibold ${deltaTone(row.status)}`}>
                        {deltaLabel}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="relative h-2 overflow-hidden rounded-full bg-raised">
                        {plannedBar ? (
                          <span
                            role="img"
                            aria-label={t('postMortem.plannedAria', {
                              title: row.title ?? row.id ?? '',
                              start: row.plannedStart ?? '—',
                              end: row.plannedEnd ?? '—',
                            })}
                            className="absolute inset-y-0 rounded-full border border-line-strong bg-line"
                            style={plannedBar}
                            title={t('postMortem.plannedAria', {
                              title: row.title ?? row.id ?? '',
                              start: row.plannedStart ?? '—',
                              end: row.plannedEnd ?? '—',
                            })}
                          />
                        ) : null}
                      </div>
                      <div className="relative h-2 overflow-hidden rounded-full bg-raised">
                        {actualBar ? (
                          <span
                            role="img"
                            aria-label={t('postMortem.actualAria', {
                              title: row.title ?? row.id ?? '',
                              start: row.actualStart ?? '—',
                              end: actualEnd ?? '—',
                            })}
                            className={`absolute inset-y-0 rounded-full ${
                              row.status === 'late'
                                ? 'bg-red-500'
                                : row.status === 'early'
                                  ? 'bg-sky-400'
                                  : row.status === 'on-time'
                                    ? 'bg-emerald-500'
                                    : 'bg-muted'
                            }`}
                            style={actualBar}
                            title={t('postMortem.actualAria', {
                              title: row.title ?? row.id ?? '',
                              start: row.actualStart ?? '—',
                              end: actualEnd ?? '—',
                            })}
                          />
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <div className="mt-5">
            <SocialExportStudio surface="mc" wedding={wedding} liveState={liveState} />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
