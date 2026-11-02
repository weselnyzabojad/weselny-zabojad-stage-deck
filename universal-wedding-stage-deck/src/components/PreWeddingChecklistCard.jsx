// Pre-flight checklist extracted by the AI converter. Check states live in the
// synced `checked_subtasks` map, keyed by the task text.
export default function PreWeddingChecklistCard({ tasks = [], checked = {}, onToggle }) {
  if (tasks.length === 0) return null;

  const doneCount = tasks.filter((task) => checked[task.task] ?? task.done).length;

  return (
    <section className="rounded-xl border border-[#2b3d73] bg-[#0b132b]/95 p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-white">
          🧳 Pre-Wedding Checklist
        </h2>
        <span className="rounded border border-[#2b3d73] bg-[#111d3b] px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-300">
          {doneCount}/{tasks.length}
        </span>
      </div>

      <ul className="mt-2 space-y-1.5">
        {tasks.map((task) => {
          const done = checked[task.task] ?? task.done;
          return (
            <li key={task.task}>
              <button
                type="button"
                onClick={() => onToggle(task.task)}
                aria-pressed={done}
                className={`flex w-full items-start gap-2 rounded-lg border p-2 text-left text-[11px] leading-snug transition ${
                  done
                    ? 'border-emerald-900/70 bg-emerald-950/30 text-slate-500'
                    : 'border-[#1c2a52] bg-[#070b19]/70 text-slate-300 hover:border-[#3b5bdb]/60 hover:bg-[#111d3b]'
                }`}
              >
                <span aria-hidden="true" className={done ? 'text-emerald-400' : 'text-slate-500'}>
                  {done ? '☑' : '☐'}
                </span>
                <span className={done ? 'line-through' : ''}>{task.task}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
