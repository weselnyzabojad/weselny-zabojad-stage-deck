import { resolveGameQuestionLists } from '../lib/games.js';
import { useI18n } from '../i18n/useI18n.js';

function statusLabel(list, t) {
  return list.unavailable
    ? t('games.unavailable')
    : t('games.questionCount', { count: list.questions.length });
}

function QuestionPreview({ list, t }) {
  if (list.unavailable) {
    return (
      <p className="mt-0.5 text-[10px] text-amber-200">
        {t('games.unavailableHelp')}
      </p>
    );
  }
  return (
    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[10px] text-ink">
      {list.questions.map((question) => (
        <li key={question.id}>{question.prompt}</li>
      ))}
    </ul>
  );
}

// MC games brief. Question-list Docs are referenced by id only; raw document
// links are never rendered. A selected predefined game uses its cartridge title
// as the card heading; the generic Games heading is only the multi-list fallback.
export default function GamesCueCard({ wedding, role, gameId = null }) {
  const { t } = useI18n();
  if (role !== 'mc') return null;
  const allLists = resolveGameQuestionLists(wedding);
  const lists = gameId ? allLists.filter((list) => list.id === gameId) : allLists;
  if (lists.length === 0) return null;

  const selectedList = gameId ? lists[0] : null;
  const heading = selectedList?.title ?? t('games.title');

  return (
    <div className="rounded-lg border border-brand-strong/50 bg-brand/10 p-2.5 text-[11px] text-brand-tint">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
          🎲 {heading}
        </span>
        {selectedList ? (
          <span className="rounded border border-line-strong bg-raised px-1 py-0.5 font-mono text-[9px] text-ink">
            {statusLabel(selectedList, t)}
          </span>
        ) : null}
      </div>

      {selectedList ? (
        <QuestionPreview list={selectedList} t={t} />
      ) : (
        <ul className="mt-1 space-y-1.5">
          {lists.map((list) => (
            <li key={list.id} className="rounded border border-line/70 bg-page/40 p-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <strong className="text-ink">{list.title}</strong>
                <span className="rounded border border-line-strong bg-raised px-1 py-0.5 font-mono text-[9px] text-ink">
                  {statusLabel(list, t)}
                </span>
              </div>
              <QuestionPreview list={list} t={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
