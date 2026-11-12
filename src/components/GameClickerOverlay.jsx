import { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import ModalShell from './ModalShell';
import {
  GAME_LEVELS,
  buildGameResultsExport,
  gameCounters,
  orderGameItems,
  unansweredItems,
} from '../lib/games.js';

const LANGS = ['EN', 'PL', 'FR'];

// One-question-at-a-time game runner for both predefined games.
export default function GameClickerOverlay({
  open,
  game,
  weddingId = null,
  results = null,
  onResultsChange = () => {},
  onClose,
}) {
  const { t } = useI18n();
  const [lang, setLang] = useState('EN');
  const [answered, setAnswered] = useState(() => results?.questions ?? {});
  const [startedAt, setStartedAt] = useState(
    () => results?.startedAt ?? new Date().toISOString(),
  );
  const [displayId, setDisplayId] = useState(null);
  const [overrideId, setOverrideId] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [levelFilter, setLevelFilter] = useState('ALL');

  const items = useMemo(
    () => orderGameItems(game?.items ?? [], game?.gameType),
    [game?.items, game?.gameType],
  );
  const remaining = useMemo(() => unansweredItems(items, answered), [items, answered]);
  const counters = gameCounters(items, answered);
  const current =
    items.find((item) => item.id === displayId) ?? remaining[0] ?? null;
  const score = Object.values(answered).filter((result) => result?.isCompatible === true).length;
  const isCompatibility = game?.gameType === 'TEST_ZGODNOSCI';
  const complete = Boolean(current) === false && remaining.length === 0;

  const persist = (nextAnswered, { completed = false } = {}) => {
    if (!game?.id) return;
    const entries = Object.values(nextAnswered);
    const compatibility = game.gameType === 'TEST_ZGODNOSCI';
    onResultsChange(game.id, {
      gameId: game.id,
      startedAt,
      updatedAt: new Date().toISOString(),
      completedAt: completed ? new Date().toISOString() : null,
      totalQuestions: items.length,
      answeredCount: entries.length,
      ...(compatibility
        ? { score: entries.filter((entry) => entry.isCompatible === true).length }
        : {}),
      questions: nextAnswered,
    });
  };

  useEffect(() => {
    setAnswered(results?.questions ?? {});
    setStartedAt(results?.startedAt ?? new Date().toISOString());
    setDisplayId(null);
    setOverrideId(null);
    setRevealed(false);
    setLevelFilter('ALL');
  }, [game?.id]);

  const advance = useCallback(() => {
    setRevealed(false);
    setDisplayId(null);
    setOverrideId(null);
  }, []);

  const reveal = useCallback(() => {
    if (!current) return;
    const next = {
      ...answered,
      [current.id]: { answeredAt: new Date().toISOString(), revealed: true },
    };
    setRevealed(true);
    setAnswered(next);
    persist(next, { completed: Object.keys(next).length >= items.length });
  }, [answered, current, items.length, persist]);

  const recordCompatibility = useCallback(
    (isCompatible) => {
      if (!current) return;
      const next = {
        ...answered,
        [current.id]: { answeredAt: new Date().toISOString(), isCompatible },
      };
      setAnswered(next);
      persist(next, { completed: Object.keys(next).length >= items.length });
      advance();
    },
    [advance, answered, current, items.length, persist],
  );

  const navigate = useCallback(
    (direction) => {
      const pool = remaining;
      if (pool.length === 0) return;
      const index = pool.findIndex((item) => item.id === current?.id);
      const nextIndex =
        index === -1
          ? 0
          : (index + direction + pool.length) % pool.length;
      const next = pool[nextIndex];
      if (!next) return;
      setDisplayId(next.id);
      setOverrideId(next.id);
      setRevealed(false);
    },
    [current?.id, remaining],
  );

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigate(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigate(-1);
      } else if (event.key === ' ') {
        event.preventDefault();
        if (isCompatibility) return;
        if (revealed) advance();
        else reveal();
      } else if (isCompatibility && (event.key === 'm' || event.key === 'M')) {
        event.preventDefault();
        recordCompatibility(true);
      } else if (isCompatibility && (event.key === 'n' || event.key === 'N')) {
        event.preventDefault();
        recordCompatibility(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advance, isCompatibility, navigate, open, recordCompatibility, reveal, revealed]);

  const pickerItems = remaining.filter(
    (item) => !isCompatibility && (levelFilter === 'ALL' || item.level === levelFilter)
      || isCompatibility,
  );

  const reset = () => {
    if (typeof window !== 'undefined' && !window.confirm(t('game.resetConfirm'))) return;
    setAnswered({});
    setStartedAt(new Date().toISOString());
    setDisplayId(null);
    setOverrideId(null);
    setRevealed(false);
    setLevelFilter('ALL');
    onResultsChange(game?.id ?? null, null);
  };

  const exportResults = () => {
    if (typeof window === 'undefined') return;
    const entries = Object.values(answered);
    const result = {
      gameId: game?.id ?? null,
      startedAt,
      updatedAt: new Date().toISOString(),
      completedAt: remaining.length === 0 ? new Date().toISOString() : null,
      totalQuestions: items.length,
      answeredCount: entries.length,
      ...(isCompatibility
        ? { score: entries.filter((entry) => entry.isCompatible === true).length }
        : {}),
      questions: answered,
    };
    const payload = buildGameResultsExport({ weddingId, game, result });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${weddingId ?? 'wedding'}-${game?.id ?? 'game'}-results.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="game-title" size="full">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-5 py-3 pr-16">
        <div>
          <div className="font-heading text-[10px] font-semibold uppercase tracking-widest text-muted">
            🎮 {t('game.title')}
          </div>
          <h2 id="game-title" className="mt-0.5 font-heading text-lg font-bold text-ink">
            {game?.title ?? t('game.questions')}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-line-strong bg-raised px-2.5 py-1.5 font-mono text-[10px] text-ink">
            {t('game.counters', {
              answered: counters.answered,
              remaining: counters.remaining,
              total: counters.total,
            })}
          </span>
          {isCompatibility ? (
            <span className="rounded-lg border border-emerald-700 bg-emerald-950/50 px-2.5 py-1.5 font-mono text-[10px] font-bold text-emerald-200">
              {t('game.score', { score })}
            </span>
          ) : null}
          <button
            type="button"
            onClick={exportResults}
            className="rounded-lg border border-line-strong bg-raised px-2.5 py-1.5 text-[10px] font-semibold text-ink"
          >
            {t('game.export')}
          </button>
          <div className="flex items-center rounded-lg border border-line-strong bg-raised p-0.5">
            {LANGS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLang(option)}
                aria-pressed={lang === option}
                className={`rounded px-2 py-1 font-mono text-[10px] font-bold transition ${lang === option ? 'bg-brand text-on-accent' : 'text-muted hover:text-ink'}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center">
          {game?.unavailable ? (
            <p className="rounded-xl border border-amber-700 bg-amber-950/50 p-4 text-center text-sm text-amber-100">
              {t('games.unavailableHelp')}
            </p>
          ) : null}
          {!game?.unavailable && items.length === 0 ? (
            <p className="text-center text-sm text-muted">{t('game.none')}</p>
          ) : null}

          {!game?.unavailable && complete ? (
            <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-8 text-center">
              <h3 className="font-heading text-2xl font-bold text-emerald-200">
                {t('game.completeTitle')}
              </h3>
              <p className="mt-2 text-sm text-emerald-100">
                {isCompatibility
                  ? t('game.completeScore', {
                      score,
                      total: counters.total,
                    })
                  : t('game.completeCount', { total: counters.total })}
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-4 rounded-lg border border-line-strong bg-raised px-4 py-2 text-xs font-semibold text-ink"
              >
                {t('game.reset')}
              </button>
            </div>
          ) : null}

          {!game?.unavailable && current ? (
            <div className="rounded-2xl border border-line bg-card p-6 text-center shadow-lg sm:p-8">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="font-heading text-[10px] font-semibold uppercase tracking-widest text-muted">
                  {t('game.question', { number: items.indexOf(current) + 1 })}
                </span>
                {current.level ? (
                  <span className="rounded border border-brand-strong bg-brand/30 px-1.5 py-0.5 font-mono text-[9px] font-bold text-brand-tint">
                    {t(`game.level.${current.level}`)}
                  </span>
                ) : null}
                {overrideId ? (
                  <span className="rounded border border-amber-700 bg-amber-950/50 px-1.5 py-0.5 font-mono text-[9px] text-amber-200">
                    {t('game.override')}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 font-heading text-2xl font-bold leading-snug text-ink sm:text-3xl">
                {current.question?.[lang] ?? current.question?.EN ?? current.question ?? ''}
              </p>

              <div className="mt-6 min-h-[92px]">
                {isCompatibility ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => recordCompatibility(true)}
                      className="rounded-xl border border-emerald-700 bg-emerald-950/60 px-5 py-3 font-heading text-sm font-bold text-emerald-200"
                    >
                      ✓ {t('game.match')}
                    </button>
                    <button
                      type="button"
                      onClick={() => recordCompatibility(false)}
                      className="rounded-xl border border-alert/60 bg-alert/20 px-5 py-3 font-heading text-sm font-bold text-alert-soft"
                    >
                      ✕ {t('game.noMatch')}
                    </button>
                  </div>
                ) : revealed ? (
                  <div className="rounded-xl border border-emerald-800 bg-emerald-950/60 px-4 py-4">
                    <div className="font-heading text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
                      {t('game.answer')}
                    </div>
                    <div className="mt-1 font-heading text-3xl font-bold text-emerald-200">
                      {current.answer}
                    </div>
                    <button
                      type="button"
                      onClick={() => setRevealed(false)}
                      className="mt-2 rounded border border-line-strong bg-raised px-2 py-1 text-[10px] text-ink"
                    >
                      {t('game.hide')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={reveal}
                    className="rounded-xl border border-brand-strong bg-brand/40 px-5 py-3 font-heading text-sm font-semibold text-ink transition hover:bg-brand/70"
                  >
                    {t('game.reveal')}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <details className="border-t border-line bg-card px-4 py-2">
        <summary className="cursor-pointer font-heading text-[10px] font-semibold uppercase tracking-widest text-brand-soft">
          {t('game.picker')}
        </summary>
        {!isCompatibility ? (
          <label className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-muted">
            {t('game.levelFilter')}
            <select
              value={levelFilter}
              onChange={(event) => setLevelFilter(event.target.value)}
              className="rounded border border-line-strong bg-page px-1.5 py-1 text-[10px] text-ink"
            >
              <option value="ALL">{t('game.levels.all')}</option>
              {GAME_LEVELS.map((level) => (
                <option key={level} value={level}>{t(`game.level.${level}`)}</option>
              ))}
            </select>
          </label>
        ) : null}
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {pickerItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  setDisplayId(item.id);
                  setOverrideId(item.id);
                  setRevealed(false);
                }}
                className={`rounded border px-2 py-1 text-left text-[10px] ${item.id === current?.id ? 'border-brand-strong bg-brand/20 text-ink' : 'border-line bg-page text-muted'}`}
              >
                <span className="font-mono text-[9px]">{items.indexOf(item) + 1}.</span>{' '}
                {item.level ? `${t(`game.level.${item.level}`)} · ` : ''}
                {item.question?.[lang] ?? item.question?.EN ?? item.question}
              </button>
            </li>
          ))}
        </ul>
      </details>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-card px-4 py-3">
        <span className="font-mono text-[10px] text-muted">{t('game.help')}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-line-strong bg-raised px-3 py-2 font-heading text-xs font-semibold text-ink"
          >
            {t('game.reset')}
          </button>
          <button
            type="button"
            onClick={() => (revealed ? advance() : navigate(-1))}
            className="rounded-lg border border-line-strong bg-raised px-4 py-2 font-heading text-xs font-semibold text-ink"
          >
            ← {t('game.previous')}
          </button>
          <button
            type="button"
            onClick={() => (revealed ? advance() : navigate(1))}
            disabled={!current}
            className="rounded-lg border border-brand-strong bg-brand px-5 py-2 font-heading text-xs font-bold text-on-accent disabled:cursor-not-allowed disabled:border-line disabled:bg-card disabled:text-muted"
          >
            {revealed && remaining.length <= 1
              ? t('game.finish')
              : `${t('game.next')} →`}
          </button>
        </div>
      </footer>
    </ModalShell>
  );
}
