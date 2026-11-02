import { useState } from 'react';
import ModalShell from './ModalShell';

const LANGS = ['ALL', 'PL', 'FR', 'EN'];
const MIN_TEXT_SIZE = 18;
const MAX_TEXT_SIZE = 40;

const LANG_TONES = {
  PL: 'border-[#ED2939]/50 bg-[#ED2939]/10 text-[#ff808a]',
  FR: 'border-[#3b5bdb] bg-[#002395]/30 text-[#849dff]',
  EN: 'border-cyan-800 bg-cyan-950/50 text-cyan-300'
};

// Full-screen trilingual script reader. Sections come from the step's
// `teleprompter` payload in the wedding cartridge.
export default function TeleprompterOverlay({ open, step, onClose }) {
  const [lang, setLang] = useState('ALL');
  const [textSize, setTextSize] = useState(24);

  const teleprompter = step?.teleprompter;
  const items = teleprompter?.items ?? [];

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="teleprompter-title" size="full">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1c2a52] bg-[#0b132b] px-5 py-3 pr-16">
        <div>
          <div className="flex items-center gap-2 font-heading text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            <span>🎤 Teleprompter</span>
            <span className="rounded border border-[#3b5bdb] bg-[#002395]/40 px-1.5 py-0.5 font-mono text-[#849dff]">
              {teleprompter?.type === 'GAME_QUESTIONS' ? 'GAME' : 'SPEECH'}
            </span>
          </div>
          <h2 id="teleprompter-title" className="mt-0.5 font-heading text-lg font-bold text-white">
            {step?.title ?? 'Teleprompter'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-[#2b3d73] bg-[#111d3b] p-0.5">
            {LANGS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLang(option)}
                aria-pressed={lang === option}
                className={`rounded px-2 py-1 font-mono text-[10px] font-bold transition ${lang === option ? 'bg-[#002395] text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="flex items-center rounded-lg border border-[#2b3d73] bg-[#111d3b]">
            <button
              type="button"
              onClick={() => setTextSize((size) => Math.max(MIN_TEXT_SIZE, size - 2))}
              disabled={textSize <= MIN_TEXT_SIZE}
              aria-label="Decrease text size"
              className="px-2.5 py-1.5 text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:text-slate-600"
            >
              A−
            </button>
            <span className="px-1 font-mono text-[10px] text-slate-500">{textSize}</span>
            <button
              type="button"
              onClick={() => setTextSize((size) => Math.min(MAX_TEXT_SIZE, size + 2))}
              disabled={textSize >= MAX_TEXT_SIZE}
              aria-label="Increase text size"
              className="px-2.5 py-1.5 text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:text-slate-600"
            >
              A+
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="mx-auto max-w-4xl space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-slate-400">No script is attached to this step.</p>
          ) : (
            items.map((item, index) => {
              const lines = (item.lines ?? []).filter((line) => lang === 'ALL' || line.lang === lang);
              return (
                <section key={item.id ?? index} className="rounded-xl border border-[#1c2a52] bg-[#0b132b]/80 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                    <h3 className="font-heading text-xs font-bold uppercase tracking-widest text-slate-300">
                      {item.heading}
                    </h3>
                  </div>

                  {lines.length === 0 ? (
                    <p className="text-sm italic text-slate-500">No {lang} line for this section.</p>
                  ) : (
                    <div className="space-y-3">
                      {lines.map((line) => (
                        <p key={line.lang} className="flex items-start gap-3">
                          <span className={`mt-1.5 shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${LANG_TONES[line.lang] ?? 'border-[#2b3d73] bg-[#111d3b] text-slate-300'}`}>
                            {line.lang}
                          </span>
                          <span className="text-white" style={{ fontSize: `${textSize}px`, lineHeight: 1.45 }}>
                            {line.text}
                          </span>
                        </p>
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      </div>

      <footer className="border-t border-[#1c2a52] bg-[#0b132b] px-5 py-2.5 text-center font-mono text-[11px] text-slate-500">
        Esc closes · {items.length} sections · scroll for the full script
      </footer>
    </ModalShell>
  );
}
