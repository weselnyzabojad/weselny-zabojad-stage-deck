import { useEffect, useRef, useState } from 'react';

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
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
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

    timerRef.current = setInterval(() => {
      const value = Math.min(1, (Date.now() - startedAtRef.current) / holdMs);
      setProgress(value);
      if (value >= 1) {
        clearTimer();
        completedRef.current = true;
        setHolding(false);
        setProgress(1);
        onConfirm?.();
        window.setTimeout(() => setProgress(0), 350);
      }
    }, 40);
  };

  const cancel = () => {
    clearTimer();
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

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
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
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
      <span className="relative z-10 flex flex-col items-center leading-tight">
        <span>{label}</span>
        <span className="text-[9px] font-normal uppercase tracking-wider opacity-80">
          {holding ? `${Math.round(progress * 100)}%` : holdLabel}
        </span>
      </span>
    </button>
  );
}
