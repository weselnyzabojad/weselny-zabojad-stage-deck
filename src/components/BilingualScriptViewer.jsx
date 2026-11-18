import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import useSpeechRecognition from '../hooks/useSpeechRecognition.js';
import {
  matchTranscript,
  scriptHighlightClass,
  tokenizeScript,
} from '../lib/speechReadAlong.js';

function languageLabel(code) {
  const value = String(code ?? '').trim().toUpperCase();
  return value || '—';
}

function TokenizedText({ text, tokens, cursor, activeRef }) {
  if (tokens.length === 0) return text;
  const nodes = [];
  let last = 0;
  tokens.forEach((token, index) => {
    if (token.start > last) nodes.push(text.slice(last, token.start));
    nodes.push(
      <span
        key={`${token.start}-${token.word}`}
        ref={index === cursor ? activeRef : null}
        className={scriptHighlightClass(index <= cursor)}
      >
        {token.word}
      </span>,
    );
    last = token.end;
  });
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export default function BilingualScriptViewer({
  scriptBlocks = [],
  languageA = 'PL',
  languageB = 'FR',
  initialActive = 'a',
  title = '',
}) {
  const { t } = useI18n();
  const blocks = useMemo(
    () => (Array.isArray(scriptBlocks) ? scriptBlocks : []),
    [scriptBlocks],
  );
  const [activeLanguage, setActiveLanguage] = useState(initialActive === 'b' ? 'b' : 'a');
  const [blockIndex, setBlockIndex] = useState(0);
  const [cursor, setCursor] = useState(-1);
  const [transcriptOffset, setTranscriptOffset] = useState(0);
  const [fontSize, setFontSize] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [cssFocus, setCssFocus] = useState(false);
  const containerRef = useRef(null);
  const activeWordRef = useRef(null);
  const block = blocks[blockIndex] ?? null;
  const textA = block?.langA_text ?? '';
  const textB = block?.langB_text ?? '';
  const activeText = activeLanguage === 'a' ? textA : textB;
  const tokens = useMemo(() => tokenizeScript(activeText), [activeText]);
  const languageCode = activeLanguage === 'a' ? languageA : languageB;
  const recognition = useSpeechRecognition({
    lang: languageCode,
    enabled: tracking,
  });

  useEffect(() => {
    if (!tracking || !recognition.transcript) return;
    const scopedTranscript = recognition.transcript.slice(transcriptOffset);
    if (!scopedTranscript) return;
    const result = matchTranscript(tokens, cursor, scopedTranscript);
    // The recognition transcript is an external event source; the cursor is the
    // latest matched word and must update after each transcript event.
    // eslint-disable-next-line react/set-state-in-effect -- transcript event updates the cursor
    if (result.index !== cursor) setCursor(result.index);

    if (result.index >= tokens.length - 1 && blockIndex < blocks.length - 1) {
      const next = blocks[blockIndex + 1];
      const nextText = activeLanguage === 'a' ? next?.langA_text : next?.langB_text;
      const nextWord = tokenizeScript(nextText)[0]?.normalized;
      if (nextWord && scopedTranscript.toLowerCase().includes(nextWord)) {
        // eslint-disable-next-line react/set-state-in-effect -- next block starts from the transcript
        setBlockIndex((current) => current + 1);
        // eslint-disable-next-line react/set-state-in-effect -- reset cursor for the next block
        setCursor(-1);
        setTranscriptOffset(recognition.transcript.length);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- caller-owned blocks array
  }, [
    activeLanguage,
    blockIndex,
    blocks,
    cursor,
    recognition.transcript,
    tokens,
    tracking,
    transcriptOffset,
  ]);

  useEffect(() => {
    if (cursor < 0 || !activeWordRef.current) return;
    const target = activeWordRef.current;
    if (typeof target.scrollIntoView !== 'function') return;
    target.scrollIntoView({
      block: 'center',
      behavior: reducedMotion() ? 'auto' : 'smooth',
    });
  }, [cursor, blockIndex]);

  useEffect(() => {
    if (!cssFocus) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setCssFocus(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cssFocus]);

  const resetTracking = () => {
    recognition.reset();
    setCursor(-1);
    setTranscriptOffset(0);
  };

  const switchLanguage = (next) => {
    if (next === activeLanguage) return;
    setActiveLanguage(next);
    setCursor(-1);
    setTranscriptOffset(0);
    resetTracking();
  };

  const startTracking = () => {
    setTracking(true);
    recognition.start();
  };

  const stopTracking = () => {
    setTracking(false);
    recognition.stop();
    resetTracking();
  };

  const adjustFontSize = (delta) => {
    setFontSize((current) => Math.min(48, Math.max(24, (current ?? 28) + delta)));
  };

  const enterFocus = async () => {
    const element = containerRef.current;
    if (element?.requestFullscreen) {
      try {
        await element.requestFullscreen();
        return;
      } catch {
        // Fall through to the CSS full-viewport fallback.
      }
    }
    setCssFocus(true);
  };

  const errorKey = recognition.error?.code
    ? `viewer.error.${recognition.error.code}`
    : null;

  return (
    <div
      ref={containerRef}
      className={`${cssFocus ? 'bilingual-focus' : ''} rounded-2xl border border-line bg-card/70`}
      data-testid="bilingual-script-viewer"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2 sm:px-4">
        <div className="min-w-0">
          {title ? <h2 className="font-heading text-sm font-bold text-ink">{title}</h2> : null}
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {languageLabel(languageA)} · {languageLabel(languageB)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => adjustFontSize(-2)}
            aria-label={t('viewer.smaller')}
            className="min-h-9 rounded border border-line bg-raised px-2 text-xs font-bold text-ink"
          >
            A−
          </button>
          <button
            type="button"
            onClick={() => adjustFontSize(2)}
            aria-label={t('viewer.larger')}
            className="min-h-9 rounded border border-line bg-raised px-2 text-xs font-bold text-ink"
          >
            A+
          </button>
          <button
            type="button"
            onClick={() => void enterFocus()}
            className="min-h-9 rounded border border-line bg-raised px-2.5 text-xs font-semibold text-ink"
          >
            {t('viewer.focus')}
          </button>
          {cssFocus ? (
            <button
              type="button"
              onClick={() => setCssFocus(false)}
              className="min-h-9 rounded border border-line bg-raised px-2.5 text-xs font-semibold text-ink"
            >
              {t('viewer.exitFocus')}
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 sm:px-4">
        <div role="group" aria-label={t('viewer.languageSelector')} className="flex gap-1">
          {['a', 'b'].map((side) => (
            <button
              key={side}
              type="button"
              aria-pressed={activeLanguage === side}
              onClick={() => switchLanguage(side)}
              className={`min-h-9 rounded border px-2.5 text-xs font-semibold ${
                activeLanguage === side
                  ? 'border-brand-strong bg-brand/30 text-ink'
                  : 'border-line bg-raised text-muted'
              }`}
            >
              {side === 'a' ? languageLabel(languageA) : languageLabel(languageB)}
            </button>
          ))}
        </div>

        {!recognition.supported ? (
          <span role="status" className="text-[11px] text-muted">
            {t('viewer.unsupported')}
          </span>
        ) : tracking ? (
          <button
            type="button"
            onClick={stopTracking}
            className="min-h-9 rounded border border-red-800 bg-red-950/50 px-3 text-xs font-bold text-red-200"
          >
            {t('viewer.stop')}
          </button>
        ) : (
          <button
            type="button"
            onClick={startTracking}
            className="min-h-9 rounded border border-brand-strong bg-brand px-3 text-xs font-bold text-on-accent"
          >
            {t('viewer.activate')}
          </button>
        )}
        {tracking ? (
          <span role="status" className="text-[11px] font-semibold text-emerald-300">
            {t('viewer.tracking')}
          </span>
        ) : null}
      </div>

      {tracking || errorKey ? (
        <div className="border-b border-line px-3 py-2 text-[11px] text-muted sm:px-4">
          {errorKey ? (
            <p role="alert" className="text-alert-tint">
              {t(errorKey)}
            </p>
          ) : (
            <p>{t('viewer.privacy')}</p>
          )}
        </div>
      ) : (
        <p className="border-b border-line px-3 py-2 text-[11px] text-muted sm:px-4">
          {t('viewer.privacy')}
        </p>
      )}

      <div className="scrollbar-hide max-h-[70vh] overflow-y-auto overscroll-contain px-3 py-4 sm:px-5">
        {blocks.length === 0 ? (
          <p className="text-sm text-muted">{t('viewer.empty')}</p>
        ) : (
          blocks.map((entry, index) => {
            const isActive = index === blockIndex;
            const entryTokens = isActive ? tokens : [];
            return (
              <section
                key={entry.id ?? index}
                aria-current={isActive ? 'true' : undefined}
                className={`mx-auto mb-8 max-w-4xl ${isActive ? 'scroll-mt-4' : ''}`}
              >
                <div className="script-marker-a pl-4">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
                    {languageLabel(languageA)}
                  </p>
                  <p
                    className="whitespace-pre-wrap font-body text-2xl leading-loose text-ink sm:text-3xl"
                    style={fontSize ? { fontSize: `${fontSize}px` } : undefined}
                  >
                    {isActive && activeLanguage === 'a' ? (
                      <TokenizedText
                        text={entry.langA_text ?? ''}
                        tokens={entryTokens}
                        cursor={cursor}
                        activeRef={activeWordRef}
                      />
                    ) : (
                      entry.langA_text ?? ''
                    )}
                  </p>
                </div>
                <div className="script-marker-b mt-5 pl-4">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
                    {languageLabel(languageB)}
                  </p>
                  <p
                    className="whitespace-pre-wrap font-body text-2xl leading-loose text-ink sm:text-3xl"
                    style={fontSize ? { fontSize: `${fontSize}px` } : undefined}
                  >
                    {isActive && activeLanguage === 'b' ? (
                      <TokenizedText
                        text={entry.langB_text ?? ''}
                        tokens={entryTokens}
                        cursor={cursor}
                        activeRef={activeWordRef}
                      />
                    ) : (
                      entry.langB_text ?? ''
                    )}
                  </p>
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
