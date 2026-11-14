import { formatFirstDanceSeconds, resolveFirstDance } from '../lib/firstDance.js';
import { useI18n } from '../i18n/useI18n.js';

// MC gets the guest-facing explanation; DJ VIP gets the exact start/stop
// timing. No other role sees First Dance timing.
export default function FirstDanceCueCard({ step, audience = 'mc' }) {
  const { t } = useI18n();
  const dance = resolveFirstDance(step);
  if (!dance.mode) return null;
  const modeLabel = t(`firstDance.mode.${dance.mode}`);

  if (audience === 'mc') {
    return (
      <div className="rounded-lg border border-brand-strong/50 bg-brand/10 p-2.5 text-[11px] text-brand-tint">
        <div className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
          💃 {t('firstDance.title')} · {modeLabel}
        </div>
        <p className="mt-0.5 text-ink">{t(`firstDance.explanation.${dance.mode}`)}</p>
        {dance.notes ? (
          <p className="mt-0.5 text-[10px] text-muted">{dance.notes}</p>
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
        💃 {t('firstDance.title')} · {modeLabel}
      </div>
      <div className="mt-1 flex flex-wrap gap-2 font-mono text-[10px]">
        <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 text-ink">
          {t('firstDance.start')}: {start ?? '—'}
        </span>
        <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5 text-ink">
          {t('firstDance.stopAfter')}: {stop ?? '—'}
        </span>
      </div>
      {dance.notes ? (
        <p className="mt-0.5 text-[10px] text-muted">{dance.notes}</p>
      ) : null}
    </div>
  );
}

