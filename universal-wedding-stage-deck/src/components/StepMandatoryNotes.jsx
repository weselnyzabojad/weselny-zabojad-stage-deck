import { useI18n } from '../i18n/useI18n.js';

// Mandatory data embedded in the step card where it applies. This replaces the
// former page-level Mandatory constraints strip.
export default function StepMandatoryNotes({ items = [], showHeading = true }) {
  const { t } = useI18n();
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div
      aria-label={t('mandatory.title')}
      className="rounded-lg border border-amber-700/50 bg-amber-950/25 p-2.5"
    >
      {showHeading ? (
        <h3 className="flex items-center gap-1.5 font-heading text-[10px] font-bold uppercase tracking-widest text-amber-200">
          <span aria-hidden="true">📌</span>
          <span>{t('mandatory.title')}</span>
        </h3>
      ) : null}
      <div className={`flex flex-wrap gap-1.5 ${showHeading ? 'mt-1.5' : ''}`}>
        {items.map((item, index) => {
          const key = item.key ?? `${item.kind}_${index}`;
          if (item.kind === 'firstArrival' || item.kind === 'prestationReady') {
            return (
              <span
                key={key}
                className="rounded border border-line-strong bg-raised px-1.5 py-0.5 text-[10px] text-ink"
              >
                {t(`mandatory.${item.kind === 'firstArrival' ? 'firstArrival' : 'prestation'}`)}:{' '}
                <strong className="font-mono text-ink">{item.time}</strong>
              </span>
            );
          }
          if (item.kind === 'kitchenService') {
            return (
              <span
                key={key}
                className="rounded border border-line-strong bg-raised px-1.5 py-0.5 text-[10px] text-ink"
              >
                {item.label}: <strong className="font-mono text-ink">{item.time}</strong>
                <span className="ml-1 rounded border border-brand-strong/50 bg-brand/20 px-1 font-semibold text-brand-tint">
                  {t(`mandatory.serviceMode.${item.mode}`)}
                </span>
              </span>
            );
          }
          if (item.kind === 'cakeServiceMode') {
            return (
              <span
                key={key}
                className="rounded border border-line-strong bg-raised px-1.5 py-0.5 text-[10px] text-ink"
              >
                {t('mandatory.cake')}:{' '}
                <strong className="text-ink">{t(`mandatory.cakeMode.${item.mode}`)}</strong>
              </span>
            );
          }
          return (
            <span
              key={key}
              className="rounded border border-amber-700/60 bg-amber-950/40 px-1.5 py-0.5 text-[10px] text-amber-100"
            >
              {item.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
