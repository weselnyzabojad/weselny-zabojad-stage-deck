import { resolveMandatoryConstraints } from '../lib/mandatorySteps.js';

const CAKE_SERVICE_LABELS = {
  KITCHEN_RETURN: 'Kitchen return / plated pieces',
  CUT_IN_PLACE: 'Cut in place / guests come to the cake spot',
};

// Mandatory constraints are exact-hour obligations, not timeline steps.
// First guests arrival is visible only to MC and DJ VIP; kitchen/cake detail is
// MC-only. Closure/last song stay in the dedicated closure banner.
export default function MandatoryConstraintsCard({
  wedding,
  role,
  isVipDj = false,
  override = null,
}) {
  const isMc = role === 'mc';
  const isDjVip = role === 'dj' && isVipDj;
  if (!isMc && !isDjVip) return null;

  const constraints = resolveMandatoryConstraints(wedding, override);
  const hasArrival = Boolean(constraints.firstGuestsArrival);
  const hasMcDetail =
    isMc &&
    (constraints.prestationReady ||
      constraints.kitchenServices.length > 0 ||
      constraints.cakeServiceMode);

  if (!hasArrival && !hasMcDetail) return null;

  return (
    <section
      aria-label="Mandatory constraints"
      className="border-b border-line bg-card px-4 py-2 text-[10px] text-slate-300"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-heading font-semibold uppercase tracking-widest text-brand-soft">
          📌 Mandatory constraints
        </span>
        {hasArrival ? (
          <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5">
            First guests arrival:{' '}
            <strong className="font-mono text-white">{constraints.firstGuestsArrival}</strong>
          </span>
        ) : null}
        {isMc && constraints.prestationReady ? (
          <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5">
            Prestation ready (derived):{' '}
            <strong className="font-mono text-white">{constraints.prestationReady}</strong>
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
                {service.modeLabel}
              </span>
            </span>
          ))}
          <span className="rounded border border-line-strong bg-raised px-1.5 py-0.5">
            Cake:{' '}
            <strong className="text-white">
              {CAKE_SERVICE_LABELS[constraints.cakeServiceMode] ?? constraints.cakeServiceMode}
            </strong>
          </span>
        </div>
      ) : null}
    </section>
  );
}
