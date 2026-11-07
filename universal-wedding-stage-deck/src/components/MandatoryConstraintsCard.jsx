import { resolveMandatoryConstraints } from '../lib/mandatorySteps.js';
import { resolveCeremony } from '../lib/ceremony.js';
import { useI18n } from '../i18n/useI18n.js';

// Mandatory constraints are exact-hour obligations, not timeline steps.
// First guests arrival is visible only to MC and DJ VIP; kitchen/cake detail is
// MC-only. Closure/last song stay in the dedicated closure banner.
export default function MandatoryConstraintsCard({
  wedding,
  role,
  isVipDj = false,
  override = null,
}) {
  const { t } = useI18n();
  const isMc = role === 'mc';
  const isDjVip = role === 'dj' && isVipDj;
  if (!isMc && !isDjVip) return null;

  const constraints = resolveMandatoryConstraints(wedding, override);
  const ceremony = isMc ? resolveCeremony(wedding) : null;
  const ceremonyNote =
    ceremony?.type === 'RELIGIOUS' && !ceremony.mcSupportRequested
      ? ceremony.location
        ? t('ceremony.arrivalNoteAt', { location: ceremony.location })
        : t('ceremony.arrivalNote')
      : null;
  const hasArrival = Boolean(constraints.firstGuestsArrival);
  const hasMcDetail =
    isMc &&
    (constraints.prestationReady ||
      constraints.kitchenServices.length > 0 ||
      constraints.cakeServiceMode);

  if (!hasArrival && !hasMcDetail) return null;

  return (
    <section
      aria-label={t('mandatory.title')}
      className="border-b border-line bg-card px-4 py-2 text-[10px] text-slate-300"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-heading font-semibold uppercase tracking-widest text-brand-soft">
          📌 {t('mandatory.title')}
        </span>
        {hasArrival ? (
          <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5">
            {t('mandatory.firstArrival')}:{' '}
            <strong className="font-mono text-white">{constraints.firstGuestsArrival}</strong>
          </span>
        ) : null}
        {isMc && constraints.prestationReady ? (
          <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5">
            {t('mandatory.prestation')}:{' '}
            <strong className="font-mono text-white">{constraints.prestationReady}</strong>
          </span>
        ) : null}
        {ceremonyNote ? (
          <span className="rounded border border-amber-700/60 bg-amber-950/40 px-1.5 py-0.5 text-amber-100">
            {ceremonyNote}
          </span>
        ) : null}
      </div>

      {hasMcDetail ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {constraints.kitchenServices.map((service) => (
            <span
              key={service.key}
              className="rounded border border-line-strong bg-raised px-1.5 py-0.5"
            >
              {service.label}: <strong className="font-mono text-white">{service.time}</strong>
              <span className="ml-1 rounded border border-brand-strong/50 bg-brand/20 px-1 font-semibold text-brand-tint">
                {t(`mandatory.serviceMode.${service.mode}`)}
              </span>
            </span>
          ))}
          <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5">
            {t('mandatory.cake')}:{' '}
            <strong className="text-white">
              {t(`mandatory.cakeMode.${constraints.cakeServiceMode}`)}
            </strong>
          </span>
        </div>
      ) : null}
    </section>
  );
}

