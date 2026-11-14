import { useEffect, useMemo, useState } from 'react';
import { clockToEventDate, formatCountdown, resolveEventDateISO } from '../lib/eventTime.js';
import { useI18n } from '../i18n/useI18n';

function remainingSeconds(clock, projectedEnd) {
  const now = clock?.now instanceof Date ? clock.now : null;
  if (!now || !projectedEnd) return null;
  const endAt = clockToEventDate({
    clock: projectedEnd,
    eventDateISO: clock?.eventDateISO ?? null,
    timeZone: clock?.timeZone ?? null,
    after: now,
  });
  if (!endAt) return null;
  return Math.round((endAt.getTime() - now.getTime()) / 1000);
}

export default function MusicalSetBar({
  wedding,
  clock,
  activeEntry,
  onExtend,
  extensionAllowed = false,
  extensionUntil = null,
  closureTime = null,
  extensionBlockedReason = null,
}) {
  const { t } = useI18n();
  const [running, setRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [notice, setNotice] = useState('');
  const stepId = activeEntry?.step?.id ?? null;
  const projectedEnd = activeEntry?.projectedEnd ?? null;
  const remaining = useMemo(() => {
    const context = {
      ...clock,
      eventDateISO:
        clock?.eventDateISO ?? resolveEventDateISO(wedding),
    };
    return remainingSeconds(context, projectedEnd);
  }, [clock, projectedEnd, wedding]);

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => setElapsedSec((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  if (!stepId || activeEntry?.step?.optionalFlag !== 'dj_set') return null;

  const amber = remaining != null && remaining <= 15 * 60;
  const urgent = remaining != null && remaining <= 5 * 60;
  const warning =
    urgent
      ? t('dj.set.urgent', { time: formatCountdown(Math.max(remaining, 0)) })
      : amber
        ? t('dj.set.amber', { time: formatCountdown(Math.max(remaining, 0)) })
        : '';

  const handleExtend = () => {
    const result = onExtend?.();
    if (!result) return;
    setNotice(
      result.canExtend
        ? t('dj.set.extended')
        : t(`dj.set.blocked.${result.reason ?? 'unavailable'}`, {
            time: extensionUntil ?? closureTime ?? '',
          }),
    );
  };

  return (
    <section
      aria-label={t('dj.set.title')}
      className={`flex flex-wrap items-center gap-2 border-b px-3 py-2 text-xs sm:gap-3 ${
        urgent
          ? 'border-alert bg-alert/15'
          : amber
            ? 'border-amber-600 bg-amber-950/30'
            : 'border-line bg-card'
      }`}
    >
      <span className="font-heading text-[10px] font-bold uppercase tracking-widest text-ink">
        {t('dj.set.title')}
      </span>
      <div
        role="timer"
        aria-live="off"
        className={`flex items-baseline gap-1 rounded-lg border px-2 py-1 ${
          urgent
            ? 'animate-pulse border-alert bg-alert/20 text-alert-soft motion-reduce:animate-none'
            : amber
              ? 'border-amber-600 bg-amber-950/40 text-amber-100'
              : 'border-line bg-page/80 text-ink'
        }`}
      >
        <span className="text-[10px] uppercase tracking-wider text-muted">
          {t('dj.set.remaining')}
        </span>
        <span className="font-mono text-lg font-bold">
          {formatCountdown(remaining ?? 0)}
        </span>
      </div>
      {warning ? (
        <span role="status" aria-live="polite" className="font-semibold text-amber-100">
          {warning}
        </span>
      ) : null}
      <span className="font-mono text-[11px] text-muted">
        {t('dj.set.localTimer')}: {formatCountdown(elapsedSec)}
      </span>
      <button
        type="button"
        onClick={() => setRunning((value) => !value)}
        className="min-h-9 rounded border border-line bg-raised px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink"
        aria-pressed={running}
      >
        {running ? t('dj.set.stop') : t('dj.set.play')}
      </button>
      <button
        type="button"
        onClick={handleExtend}
        disabled={!extensionAllowed || Boolean(extensionBlockedReason)}
        title={
          extensionAllowed && !extensionBlockedReason
            ? t('dj.set.extendHint', { time: extensionUntil ?? closureTime ?? '' })
            : t(`dj.set.blocked.${extensionBlockedReason ?? 'notAllowed'}`)
        }
        className="min-h-9 rounded border border-brand-strong bg-brand/20 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-brand-soft disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t('dj.set.extend')}
      </button>
      {notice ? (
        <span role="status" aria-live="polite" className="text-[10px] text-muted">
          {notice}
        </span>
      ) : null}
    </section>
  );
}
