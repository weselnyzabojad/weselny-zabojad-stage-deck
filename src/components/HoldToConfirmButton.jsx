import { useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '../i18n/useI18n';

// Hold-to-confirm action button (P0.7). A tap does nothing; the operator must
// press and hold for ~1.2s. Works with pointer and keyboard (Space/Enter).
export default function HoldToConfirmButton({
  onConfirm,
  disabled = false,
  label = 'Hold to confirm',
  holdLabel = 'Hold 1.2s',
  holdMs = 1200,
  className = '',
}) {
  const { t } = useI18n();
  const baseId = useId();
  const hintId = `${baseId}-hint`;
  const progressId = `${baseId}-progress`;
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const completedRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  const begin = () => {
    if (disabled || timerRef.current) return;
    completedRef.current = false;
    startedAtRef.current = Date.now();
    setHolding(true);
    setProgress(0);
    setAnnouncement('');

    timerRef.current = setInterval(() => {
      const value = Math.min(1, (Date.now() - startedAtRef.current) / holdMs);
      setProgress(value);
      if (value >= 1) {
        clearTimer();
        completedRef.current = true;
        setHolding(false);
        setProgress(1);
        setAnnouncement(t('hold.complete'));
        onConfirm?.();
        window.setTimeout(() => setProgress(0), 350);
      }
    }, 40);
  };

  const cancel = () => {
    clearTimer();
    if (!completedRef.current && (holding || progress > 0)) {
      setAnnouncement(t('hold.cancelled'));
    }
    setHolding(false);
    setProgress(0);
  };

  const handleKeyDown = (event) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (!event.repeat) begin();
  };

  const handleKeyUp = (event) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (!completedRef.current) cancel();
    completedRef.current = false;
  };

  const percent = Math.round(progress * 100);
  const valueText = percent >= 100
    ? t('hold.complete')
    : t('hold.progress', { percent });

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-describedby={hintId}
        title={disabled ? undefined : label}
        onPointerDown={begin}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={() => {
          if (!completedRef.current) cancel();
        }}
        onContextMenu={(event) => event.preventDefault()}
        className={`relative overflow-hidden select-none touch-none disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-white/25 transition-[width] duration-75"
          style={{ width: `${percent}%` }}
        />
        <span className="relative z-raised flex flex-col items-center leading-tight">
          <span>{label}</span>
          <span className="text-[9px] font-normal uppercase tracking-wider opacity-80">
            {holding ? `${percent}%` : holdLabel}
          </span>
        </span>
      </button>
      <span id={hintId} className="sr-only">
        {t('hold.hint', { seconds: (holdMs / 1000).toFixed(1) })}
      </span>
      <span
        id={progressId}
        role="progressbar"
        aria-label={t('hold.progressLabel')}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={percent}
        aria-valuetext={valueText}
        className="sr-only"
      >
        {valueText}
      </span>
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </span>
    </>
  );
}
