import { useCallback, useEffect, useState } from 'react';
import ModalShell from './ModalShell';

const LANGS = ['EN', 'PL', 'FR'];

// One-question-at-a-time game clicker with reveal, language switch, and
// keyboard control (arrows navigate, space reveals).
export default function GameClickerOverlay({ open, game, onClose }) {
  const [lang, setLang] = useState('EN');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const items = game?.items ?? [];
  const total = items.length;
  const item = items[index];
  const isLast = total === 0 || index === total - 1;
  const question = item?.question?.[lang] ?? item?.question?.EN ?? item?.question ?? '';

  const goNext = useCallback(() => {
    setRevealed(false);
    setIndex((current) => (current < total - 1 ? current + 1 : current));
  }, [total]);

  const goPrev = useCallback(() => {
    setRevealed(false);
    setIndex((current) => (current > 0 ? current - 1 : current));
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (event.key === ' ') {
        event.preventDefault();
        setRevealed((value) => !value);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, goNext, goPrev]);

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="game-title" size="full">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-5 py-3 pr-16">
        <div>
          <div className="font-heading text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            🎮 Game Clicker
          </div>
          <h2 id="game-title" className="mt-0.5 font-heading text-lg font-bold text-white">
            {game?.title ?? 'Game questions'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-line-strong bg-raised px-2.5 py-1.5 font-mono text-xs text-white">
            {total === 0 ? '0 / 0' : `${index + 1} / ${total}`}
          </span>
          <div className="flex items-center rounded-lg border border-line-strong bg-raised p-0.5">
            {LANGS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLang(option)}
                aria-pressed={lang === option}
                className={`rounded px-2 py-1 font-mono text-[10px] font-bold transition ${lang === option ? 'bg-brand text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center">
          {total === 0 ? (
            <p className="text-center text-sm text-slate-400">No game questions attached to this cartridge.</p>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap justify-center gap-1.5" aria-hidden="true">
                {items.map((entry, dotIndex) => (
                  <span
                    key={entry.id ?? dotIndex}
                    className={`h-1.5 rounded-full transition-all ${dotIndex === index ? 'w-6 bg-brand-soft' : dotIndex < index ? 'w-1.5 bg-brand-strong' : 'w-1.5 bg-line-strong'}`}
                  />
                ))}
              </div>

              <div className="rounded-2xl border border-line bg-card p-6 text-center shadow-lg sm:p-8">
                <span className="font-heading text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Question {index + 1}
                </span>
                <p className="mt-3 font-heading text-2xl font-bold leading-snug text-white sm:text-3xl">
                  {question}
                </p>

                <div className="mt-6 min-h-[92px]">
                  {revealed ? (
                    <div className="rounded-xl border border-emerald-800 bg-emerald-950/60 px-4 py-4">
                      <div className="font-heading text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
                        Answer
                      </div>
                      <div className="mt-1 font-heading text-3xl font-bold text-emerald-200">{item?.answer}</div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRevealed(true)}
                      className="rounded-xl border border-brand-strong bg-brand/40 px-5 py-3 font-heading text-sm font-semibold text-white transition hover:bg-brand/70"
                    >
                      Reveal answer
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-card px-4 py-3">
        <span className="font-mono text-[10px] text-slate-500">← → navigate · Space reveals · Esc closes</span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={index === 0}
            className="rounded-lg border border-line-strong bg-raised px-4 py-2 font-heading text-xs font-semibold text-slate-200 transition hover:bg-line disabled:cursor-not-allowed disabled:text-slate-600"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            disabled={total === 0}
            className="rounded-lg border border-line-strong bg-raised px-4 py-2 font-heading text-xs font-semibold text-slate-200 transition hover:bg-line disabled:cursor-not-allowed disabled:text-slate-600"
          >
            {revealed ? 'Hide answer' : 'Reveal answer'}
          </button>
          <button
            type="button"
            onClick={isLast ? onClose : goNext}
            disabled={total === 0}
            className="rounded-lg border border-brand-strong bg-brand px-5 py-2 font-heading text-xs font-bold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:border-line disabled:bg-card disabled:text-slate-600"
          >
            {isLast ? 'Finish ✓' : 'Next →'}
          </button>
        </div>
      </footer>
    </ModalShell>
  );
}
