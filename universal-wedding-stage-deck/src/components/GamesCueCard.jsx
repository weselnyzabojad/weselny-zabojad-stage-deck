import { resolveGameQuestionLists } from '../lib/games.js';
import { useI18n } from '../i18n/useI18n.js';

// MC games brief. Question-list Docs are referenced by id only; raw document
// links are never rendered. Missing/unavailable lists show a safe state.
export default function GamesCueCard({ wedding, role, gameId = null }) {
  const { t } = useI18n();
  if (role !== 'mc') return null;
  const allLists = resolveGameQuestionLists(wedding);
  const lists = gameId ? allLists.filter((list) => list.id === gameId) : allLists;
  if (lists.length === 0) return null;

  return (
    <div className="rounded-lg border border-brand-strong/50 bg-brand/10 p-2.5 text-[11px] text-brand-tint">
      <div className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
        🎲 {t('games.title')}
      </div>
      <ul className="mt-1 space-y-1.5">
        {lists.map((list) => (
          <li key={list.id} className="rounded border border-line/70 bg-page/40 p-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <strong className="text-ink">{list.title}</strong>
              <span className="rounded border border-line-strong bg-raised px-1 py-0.5 font-mono text-[9px] text-ink">
                {list.unavailable
                  ? t('games.unavailable')
                  : t('games.questionCount', { count: list.questions.length })}
              </span>
            </div>
            {!list.unavailable ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[10px] text-ink">
                {list.questions.map((question) => (
                  <li key={question.id}>{question.prompt}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-0.5 text-[10px] text-amber-200">
                {t('games.unavailableHelp')}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

