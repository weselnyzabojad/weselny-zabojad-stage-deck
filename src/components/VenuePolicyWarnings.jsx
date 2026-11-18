import { useI18n } from '../i18n/useI18n';

const FX_KEYS = {
  smoke: 'venuePolicy.dmx.smoke',
  haze: 'venuePolicy.dmx.haze',
  sparks: 'venuePolicy.dmx.sparks',
};

export default function VenuePolicyWarnings({
  warnings = [],
  paper = false,
  effectsOnly = false,
}) {
  const { t } = useI18n();
  const items = (Array.isArray(warnings) ? warnings : []).filter(
    (warning) => warning?.type === 'dmx-lock' || (!effectsOnly && warning?.type === 'redline'),
  );
  if (items.length === 0) return null;

  return (
    <div data-testid="venue-policy-warnings" className="space-y-1.5">
      {items.map((warning, index) =>
        warning.type === 'redline' ? (
          <p
            key={`redline-${index}`}
            role="status"
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
              paper
                ? 'border-amber-700/70 bg-amber-100/80 text-amber-950'
                : 'border-amber-700 bg-amber-950/50 text-amber-200'
            }`}
          >
            {t('venuePolicy.redline', { decibelLimit: warning.decibelLimit })}
            {' · '}
            {t('venuePolicy.redlineAdvice', { masterDb: warning.advice?.masterDb ?? -3 })}
          </p>
        ) : (
          <span
            key={`${warning.effect}-${index}`}
            className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold ${
              paper
                ? 'border-red-800/60 bg-red-100/80 text-red-950'
                : 'border-red-900/60 bg-red-950/40 text-red-300'
            }`}
          >
            <span aria-hidden="true">⛔</span>
            {t(FX_KEYS[warning.effect] ?? 'venuePolicy.dmx.other')}
          </span>
        ),
      )}
    </div>
  );
}
