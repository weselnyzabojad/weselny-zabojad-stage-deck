import { useI18n } from '../i18n/useI18n';
import { topBarControl } from '../lib/topBarStyles.js';

// Speeches are wanted as soon as the cartridge carries at least one speech or
// enables a non-OFF mode. Otherwise the chip is refused (red).
function resolveSpeechTone({ mode, speeches = [], activeSpeechId = null }) {
  const list = speeches ?? [];
  if (list.length === 0) return 'negative';
  if (activeSpeechId && list.some((speech) => speech?.id === activeSpeechId)) return 'positive';
  if (mode === 'LIGHT' || mode === 'COMPLEX') return 'positive';
  return 'negative';
}

// MC header indicator for speech readiness. The chip stays visible even when
// the cartridge has no speeches; the Speeches card itself is hidden separately.
export default function SpeechesChip({
  mode = 'OFF',
  speeches = [],
  activeSpeechId = null,
  compact = false,
  className = '',
}) {
  const { t } = useI18n();
  const toneKey = resolveSpeechTone({ mode, speeches, activeSpeechId });
  const tone = topBarControl(toneKey);
  const list = speeches ?? [];
  const activeSpeech = activeSpeechId
    ? list.find((speech) => speech?.id === activeSpeechId) ?? null
    : null;
  const statusLabel =
    activeSpeech && toneKey === 'positive' ? t('speeches.live') : t(`speeches.mode.${mode}`);
  const description = [
    `${t('speeches.chip')}: ${statusLabel}`,
    list.length > 0 ? `${list.length}` : t('speeches.none'),
    activeSpeech?.speaker?.name ?? null,
  ]
    .filter(Boolean)
    .join(' · ');

  // Pocket chip is text-only; the full mode/count/speaker stays in the
  // accessible name and tooltip.
  if (compact) {
    return (
      <div
        role="note"
        aria-label={description}
        title={description}
        className={`inline-flex items-center rounded-full px-2.5 py-1 ${tone} ${className}`}
      >
        <span className="font-heading text-[10px] font-bold uppercase tracking-widest">
          {t('speeches.chip')}
        </span>
      </div>
    );
  }

  return (
    <div
      role="note"
      aria-label={description}
      title={description}
      className={`flex items-center gap-2 rounded-lg ${compact ? 'px-2 py-1' : 'px-2.5 py-1.5 items-start'} ${tone} ${className}`}
    >
      <span aria-hidden="true" className={`shrink-0 leading-none ${compact ? 'text-base' : 'text-lg'} ${compact ? '' : 'mt-0.5'}`}>
        🗣️
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-heading text-[10px] font-bold uppercase tracking-widest">
            {t('speeches.chip')}
          </span>
          {compact ? (
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-current"
            />
          ) : (
            <span className="flex items-center gap-1 font-mono text-[10px] font-bold">
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full bg-current"
              />
              {statusLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
