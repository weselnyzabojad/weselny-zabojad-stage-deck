import logo from '../assets/img/logo.png';
import CakeCard from './CakeCard';
import CoupleIdentity from './CoupleIdentity';
import MusicPolicyCard from './MusicPolicyCard';
import ReelClock from './ReelClock';
import RoleSwitcher from './RoleSwitcher';
import SyncStatusBadge from './SyncStatusBadge';

const DRIFT_TONES = {
  late: 'border-[#ED2939]/60 bg-[#ED2939]/20 text-[#ff808a]',
  early: 'border-emerald-700 bg-emerald-950/60 text-emerald-300',
  ontime: 'border-[#2b3d73] bg-[#111d3b] text-slate-200',
  unknown: 'border-[#2b3d73] bg-[#111d3b] text-slate-400',
};

// Compact host phone view for walking segments (garden aperitif, outdoor
// ceremony, terrace cake). Advances the same room state as the MC tablet.
export default function PocketRemoteView({
  wedding,
  timeline,
  clock,
  cake,
  musicPolicy,
  onAdvance,
  onUndo,
  onOpenScript,
  hasScript,
  syncStatus,
  syncError,
  remoteUpdatedAt,
  role,
  roles,
  onRoleChange,
}) {
  const activeIndex = timeline.findIndex((entry) => entry.isActive);
  const activeEntry = activeIndex >= 0 ? timeline[activeIndex] : null;
  const nextEntry = activeIndex >= 0 ? timeline[activeIndex + 1] ?? null : null;
  const completedCount = timeline.filter((entry) => entry.isDone).length;
  const isComplete = !activeEntry;
  const driftText = activeEntry?.driftLabel ?? 'No actual start yet';
  const driftClass = DRIFT_TONES[activeEntry?.driftTone ?? 'unknown'];

  return (
    <div className="flex min-h-screen flex-col bg-[#070b19] text-slate-100 antialiased select-none">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c2a52] bg-[#0b132b] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-lg bg-white px-2 py-1">
            <img src={logo} alt="Weselny Żabojad" className="h-8 w-auto object-contain" />
          </div>
          <div>
            <div className="font-heading text-[10px] font-semibold uppercase tracking-[0.2em] text-[#849dff]">
              📱 Pocket Remote
            </div>
            <CoupleIdentity wedding={wedding} className="text-xs" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} />
          <RoleSwitcher role={role} roles={roles} onChange={onRoleChange} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 p-3">
        <ReelClock clock={clock} compact />

        <div className={`flex items-center justify-between rounded-xl border px-3 py-2 font-mono ${driftClass}`}>
          <span className="text-[10px] uppercase tracking-widest">Drift</span>
          <span className="text-sm font-bold">{driftText ?? 'No actual start yet'}</span>
        </div>

        {isComplete ? (
          <section className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-[#1c2a52] bg-[#0b132b] p-6 text-center">
            <div className="text-4xl">🎉</div>
            <h1 className="mt-2 font-heading text-xl font-bold text-white">All steps complete</h1>
            <p className="mt-1 text-xs text-slate-400">
              {completedCount} / {timeline.length} steps marked done. Use Undo if you advanced by mistake.
            </p>
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-[#1c2a52] bg-[#0b132b] p-4 shadow-xl">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-400">
                <span>Step {activeIndex + 1} of {timeline.length}</span>
                <span>{activeEntry.step.type.replaceAll('_', ' ')}</span>
              </div>
              <h1 className="mt-1 font-heading text-2xl font-bold leading-tight text-white">
                {activeEntry.step.title}
              </h1>
              <div className="mt-1 text-xs text-slate-400">📍 {activeEntry.step.location}</div>

              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="rounded-lg border border-[#1c2a52] bg-[#070b19] p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Real start</div>
                  <div className="text-base font-semibold text-white">{activeEntry.projectedStart ?? '—'}</div>
                </div>
                <div className="rounded-lg border border-[#1c2a52] bg-[#070b19] p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Est. end</div>
                  <div className="text-base font-semibold text-white">{activeEntry.projectedEnd ?? '—'}</div>
                </div>
              </div>

              {hasScript ? (
                <button
                  type="button"
                  onClick={onOpenScript}
                  className="mt-3 w-full rounded-lg border border-[#2b3d73] bg-[#111d3b] px-3 py-2.5 text-xs font-heading font-semibold text-slate-200 transition hover:bg-[#1c2a52]"
                >
                  📖 Open script / teleprompter
                </button>
              ) : null}
            </section>

            <CakeCard cake={cake} compact />

            <MusicPolicyCard policy={musicPolicy} compact />

            <section className="rounded-xl border border-[#1c2a52] bg-[#0b132b]/80 p-3">
              <div className="font-heading text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Peek next
              </div>
              {nextEntry ? (
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-heading text-sm font-semibold text-white">{nextEntry.step.title}</span>
                  <span className="shrink-0 font-mono text-xs text-[#849dff]">{nextEntry.projectedStart}</span>
                </div>
              ) : (
                <div className="mt-1 text-xs text-slate-400">No further steps — event complete.</div>
              )}
            </section>
          </>
        )}

        <div className="mt-auto space-y-2 pt-2">
          <button
            type="button"
            onClick={onAdvance}
            disabled={isComplete}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-4 text-base font-heading font-bold transition ${
              isComplete
                ? 'cursor-not-allowed border-[#1c2a52] bg-[#0b132b] text-slate-500'
                : 'border-[#3b5bdb] bg-[#002395] text-white shadow-lg shadow-blue-950/60 hover:bg-[#1a3cb0] active:bg-[#00186b]'
            }`}
          >
            <span>{isComplete ? 'EVENT COMPLETE' : 'MARK DONE & ADVANCE'}</span>
            <span className="text-xl">{isComplete ? '✓' : '➔'}</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onUndo}
              disabled={completedCount === 0}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-heading font-semibold transition ${
                completedCount === 0
                  ? 'cursor-not-allowed border-[#1c2a52] bg-[#0b132b] text-slate-600'
                  : 'border-[#2b3d73] bg-[#111d3b] text-slate-200 hover:bg-[#1c2a52]'
              }`}
            >
              ↩ Undo last step
            </button>
            <span className="flex items-center rounded-xl border border-[#1c2a52] bg-[#0b132b] px-3 font-mono text-[10px] text-slate-400">
              {completedCount}/{timeline.length} done
            </span>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#1c2a52] bg-[#0b132b] px-3 py-2 text-center font-mono text-[10px] text-slate-500">
        Pocket view · advances the same room state as the MC tablet
      </footer>
    </div>
  );
}
