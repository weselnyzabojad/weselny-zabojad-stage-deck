import {
  ceremonyVisibleToMc,
  resolveCeremony,
} from '../lib/ceremony.js';
import { useI18n } from '../i18n/useI18n.js';

// MC-only ceremony briefing. Religious details appear only when MC support was
// requested; civil translation help is called out explicitly.
export default function CeremonyCueCard({ wedding, role }) {
  const { t } = useI18n();
  if (role !== 'mc') return null;
  const ceremony = resolveCeremony(wedding);
  if (!ceremonyVisibleToMc(ceremony)) return null;
  const typeLabel = ceremony.type ? t(`ceremony.type.${ceremony.type}`) : t('ceremony.fallback');

  return (
    <section
      aria-label={typeLabel}
      className="border-b border-line bg-card px-4 py-2 text-[10px] text-ink"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-heading font-semibold uppercase tracking-widest text-brand-soft">
          {ceremony.meta?.icon ?? '💍'} {typeLabel}
        </span>
        {ceremony.location ? (
          <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5">
            {ceremony.location}
          </span>
        ) : null}
        {ceremony.type === 'RELIGIOUS' ? (
          <span className="rounded border border-emerald-700 bg-emerald-950/60 px-1.5 py-0.5 text-emerald-200">
            {t('ceremony.mcSupport')}
          </span>
        ) : null}
        {ceremony.type === 'CIVIL' && ceremony.mcTranslationHelpRequested ? (
          <span className="rounded border border-amber-700 bg-amber-950/60 px-1.5 py-0.5 font-semibold text-amber-200">
            {t('ceremony.mcTranslation')}
          </span>
        ) : null}
        {ceremony.type === 'HUMANIST' ? (
          <span className="rounded border border-brand-strong/50 bg-brand/20 px-1.5 py-0.5 text-brand-tint">
            {t('ceremony.humanist')}
          </span>
        ) : null}
      </div>
      {ceremony.notes ? (
        <p className="mt-1 text-[10px] text-muted">{ceremony.notes}</p>
      ) : null}
    </section>
  );
}

