import { resolveGameQuestionLists } from '../lib/games.js';

// MC games brief. Question-list Docs are referenced by id only; raw document
// links are never rendered. Missing/unavailable lists show a safe state.
export default function GamesCueCard({ wedding, role }) {
  if (role !== 'mc') return null;
  const lists = resolveGameQuestionLists(wedding);
  if (lists.length === 0) return null;

  return (
    <div className="rounded-lg border border-brand-strong/50 bg-brand/10 p-2.5 text-[11px] text-brand-tint">
      <div className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
        🎲 Games
      </div>
      <ul className="mt-1 space-y-1.5">
        {lists.map((list) => (
          <li key={list.id} className="rounded border border-line/70 bg-page/40 p-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <strong className="text-white">{list.title}</strong>
              <span className="rounded border border-line-strong bg-raised px-1 py-0.5 font-mono text-[9px] text-slate-300">
                {list.unavailable ? 'Questions unavailable' : `${list.questions.length} questions`}
              </span>
            </div>
            {!list.unavailable ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[10px] text-slate-300">
                {list.questions.map((question) => (
                  <li key={question.id}>{question.prompt}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-0.5 text-[10px] text-amber-200">
                Question list could not be loaded. Ask the couple for the Doc or printed list.
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
