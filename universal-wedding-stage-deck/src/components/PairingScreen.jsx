import React, { useEffect, useRef, useState } from 'react';
import logo from '../assets/img/logo.png';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import { useI18n } from '../i18n/useI18n';

const PIN_LENGTH = 4;

// Full-screen local pairing gate. The DDMM PIN unlocks this device only; the
// cloud room is keyed by `wzsd:<weddingId>` (D7), never by the PIN. Production
// `/deck/` uses the server-validated per-role gate instead.
export default function PairingScreen({
  wedding,
  onPair,
  cloudConfigured = false,
  theme = 'night',
  onToggleTheme,
}) {
  const { t } = useI18n();
  const [digits, setDigits] = useState(() => Array(PIN_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const inputsRef = useRef([]);
  const submittingRef = useRef(false);
  const resetTimerRef = useRef(null);

  const code = digits.join('');
  const complete = digits.every(Boolean);

  const focusDigit = (index) => {
    const clamped = Math.max(0, Math.min(index, PIN_LENGTH - 1));
    const input = inputsRef.current[clamped];
    input?.focus();
    input?.select();
  };

  useEffect(() => {
    inputsRef.current[0]?.focus();
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const fail = (message) => {
    submittingRef.current = false;
    setError(message);
    setShake(true);
    setDigits(Array(PIN_LENGTH).fill(''));
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setShake(false);
      focusDigit(0);
    }, 450);
  };

  const submit = (value) => {
    if (submittingRef.current) return;
    if (!/^\d{4}$/.test(value)) {
      setError(t('pairing.errorDigits'));
      return;
    }

    submittingRef.current = true;
    setError('');

    let result;
    try {
      result = onPair(value);
    } catch {
      result = { ok: false };
    }

    if (!result?.ok) fail(t('pairing.errorIncorrect'));
  };

  const handleChange = (index, rawValue) => {
    const cleaned = rawValue.replace(/\D/g, '');
    if (!cleaned) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    const next = [...digits];
    const chars = cleaned.slice(0, PIN_LENGTH - index).split('');
    chars.forEach((char, offset) => {
      next[index + offset] = char;
    });
    setDigits(next);
    setError('');

    if (next.every(Boolean)) {
      submit(next.join(''));
    } else {
      focusDigit(index + chars.length);
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (digits[index]) {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
        setError('');
      } else if (index > 0) {
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        focusDigit(index - 1);
      }
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusDigit(index - 1);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusDigit(index + 1);
      return;
    }

    if (event.key === 'Enter' && complete) {
      event.preventDefault();
      submit(code);
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, PIN_LENGTH);
    if (!pasted) return;

    event.preventDefault();
    const next = Array(PIN_LENGTH).fill('');
    pasted.split('').forEach((char, offset) => {
      next[offset] = char;
    });
    setDigits(next);
    setError('');

    if (pasted.length === PIN_LENGTH) {
      submit(pasted);
    } else {
      focusDigit(pasted.length);
    }
  };

  return (
    <div className="min-h-screen w-full bg-page text-slate-100 font-body flex items-center justify-center px-4 py-8 relative overflow-hidden select-none">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(0,35,149,0.45),transparent_55%),radial-gradient(circle_at_90%_100%,rgba(237,41,57,0.18),transparent_50%)]" />

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-card border border-line rounded-2xl shadow-2xl p-7 sm:p-9">
          <div className="flex items-center justify-center bg-white rounded-xl px-4 py-3 mb-6 shadow-md">
            <img src={logo} alt="Weselny Żabojad" className="h-16 w-auto object-contain max-w-[220px]" />
          </div>

          <div className="text-center">
            <span className="text-[10px] uppercase tracking-[0.25em] text-brand-soft font-heading font-semibold">
              {t('pairing.stageDeck')}
            </span>
            <h1 className="text-2xl font-heading font-bold text-white mt-2">{wedding.couple}</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">{wedding.date} · {t('pairing.roomPairing')}</p>
          </div>

          <p className="text-sm text-slate-300 text-center mt-6">
            {t('pairing.instructionBefore')}{' '}
            <strong className="text-white">{t('pairing.pinLabel')}</strong>{' '}
            {t('pairing.instructionAfter')}
          </p>

          <div
            className={`flex justify-center gap-3 my-6 ${shake ? 'pin-shake' : ''}`}
            onPaste={handlePaste}
          >
            {digits.map((digit, index) => {
              const boxClass = error
                ? 'border-alert focus:border-alert'
                : digit
                  ? 'border-brand-strong focus:border-brand-strong'
                  : 'border-line focus:border-brand-strong';
              return (
                <input
                  key={`pin-${index}`}
                  ref={(element) => {
                    inputsRef.current[index] = element;
                  }}
                  value={digit}
                  onChange={(event) => handleChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onFocus={(event) => event.target.select()}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  aria-label={t('pairing.digitLabel', { index: index + 1, total: PIN_LENGTH })}
                  aria-invalid={Boolean(error)}
                  className={`w-16 h-[4.5rem] text-center text-4xl font-mono font-bold rounded-xl border-2 bg-page text-white outline-none transition focus:ring-2 focus:ring-brand/60 ${boxClass}`}
                />
              );
            })}
          </div>

          <div className="min-h-[1.25rem] text-center" aria-live="polite">
            {error ? <span className="text-xs font-mono text-alert-soft">{error}</span> : null}
          </div>

          <button
            type="button"
            onClick={() => submit(code)}
            disabled={!complete}
            className={`w-full mt-2 py-3.5 rounded-xl font-heading font-bold text-sm transition border ${
              complete
                ? 'bg-brand hover:bg-brand-hover active:bg-brand-active text-white border-brand-strong shadow-lg shadow-blue-950/60'
                : 'bg-raised text-slate-500 border-line cursor-not-allowed'
            }`}
          >
            🔓 {t('pairing.submit')}
          </button>

          <div className="mt-5 flex items-center justify-center gap-2 text-[11px] font-mono text-slate-400">
            <span
              className={`h-2 w-2 rounded-full inline-block ${cloudConfigured ? 'bg-emerald-400' : 'bg-slate-500'}`}
            />
            <span>{cloudConfigured ? t('pairing.cloudConfigured') : t('pairing.localOnly')}</span>
          </div>

          <p className="mt-2 text-center text-[11px] text-slate-500 leading-relaxed">
            {t('pairing.helper')}
          </p>
        </div>
      </div>
    </div>
  );
}
