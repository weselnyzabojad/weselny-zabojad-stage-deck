import logo from '../assets/img/logo.png';
import CakeCard from './CakeCard';
import CoupleIdentity from './CoupleIdentity';
import HoldToConfirmButton from './HoldToConfirmButton';
import MusicPolicyCard from './MusicPolicyCard';
import ReelClock from './ReelClock';
import RoleSwitcher from './RoleSwitcher';
import SyncStatusBadge from './SyncStatusBadge';
import ThemeToggle from './ThemeToggle';

const DRIFT_TONES = {
  late: 'border-alert/60 bg-alert/20 text-alert-soft',
  early: 'border-emerald-700 bg-emerald-950/60 text-emerald-300',
  ontime: 'border-line-strong bg-raised text-slate-200',
  unknown: 'border-line-strong bg-raised text-slate-400',
};

// Compact host phone view for walking segments (garden aperitif, outdoor
// ceremony, terrace cake). Advances the same room state as the MC tablet.
export default function PocketRemoteView({
  wedding,
  timeline,
  clock,
  drift,
  cake,
  musicPolicy,
  onAdvance,
  onUndo,
  canUndo = false,
  canAdvance = true,
  onOpenScript,
  hasScript,
  syncStatus,
  syncError,
  remoteUpdatedAt,
  role,
  roles,
  onRoleChange,
  theme = 'night',
  onToggleTheme,
}) {
  const activeIndex = timeline.findIndex((entry) => entry.isActive);
  const activeEntry = activeIndex >= 0 ? timeline[activeIndex] : null;
  const nextEntry = activeIndex >= 0 ? timeline[activeIndex + 1] ?? null : null;
  const completedCount = timeline.filter((entry) => entry.isDone).length;
  const isComplete = !activeEntry;
  const driftText = drift?.canonicalDriftLabel ?? 'No actual start yet';
  const driftClass = DRIFT_TONES[drift?.canonicalDriftTone ?? 'unknown'] ?? DRIFT_TONES.unknown;

  return (
    <div className="flex min-h-screen flex-col bg-page text-slate-100 antialiased select-none">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-card px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-lg bg-white px-2 py-1">
            <img src={logo} alt="Weselny Żabojad" className="h-8 w-auto object-contain" />
          </div>
          <div>
            <div className="font-heading text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-soft">
              📱 Pocket Remote
            </div>
            <CoupleIdentity wedding={wedding} className="text-xs" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} />
          {roles.length > 1 ? (
            <RoleSwitcher role={role} roles={roles} onChange={onRoleChange} />
          ) : null}
          <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 p-3">
        <ReelClock clock={clock} compact />

        <div
          title={drift?.detail || undefined}
          className={`flex items-center justify-between rounded-xl border px-3 py-2 font-mono ${driftClass}`}
        >
          <span className="text-[10px] uppercase tracking-widest">Drift</span>
          <span className="text-sm font-bold">{driftText ?? 'No actual start yet'}</span>
        </div>

        {isComplete ? (
          <section className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-line bg-card p-6 text-center">
            <div className="text-4xl">🎉</div>
            <h1 className="mt-2 font-heading text-xl font-bold text-white">All steps complete</h1>
            <p className="mt-1 text-xs text-slate-400">
              {completedCount} / {timeline.length} steps marked done. Use Undo if you advanced by mistake.
            </p>
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-line bg-card p-4 shadow-xl">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-400">
                <span>Step {activeIndex + 1} of {timeline.length}</span>
                <span>{activeEntry.step.type.replaceAll('_', ' ')}</span>
              </div>
              <h1 className="mt-1 font-heading text-2xl font-bold leading-tight text-white">
                {activeEntry.step.title}
              </h1>
              <div className="mt-1 text-xs text-slate-400">📍 {activeEntry.step.location}</div>

              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="rounded-lg border border-line bg-page p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Real start</div>
                  <div className="text-base font-semibold text-white">{activeEntry.projectedStart ?? '—'}</div>
                </div>
                <div className="rounded-lg border border-line bg-page p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Est. end</div>
                  <div className="text-base font-semibold text-white">{activeEntry.projectedEnd ?? '—'}</div>
                </div>
              </div>

              {hasScript ? (
                <button
                  type="button"
                  onClick={onOpenScript}
                  className="mt-3 w-full rounded-lg border border-line-strong bg-raised px-3 py-2.5 text-xs font-heading font-semibold text-slate-200 transition hover:bg-line"
                >
                  📖 Open script / teleprompter
                </button>
              ) : null}
            </section>

            <CakeCard cake={cake} compact />

            <MusicPolicyCard policy={musicPolicy} compact />

            <section className="rounded-xl border border-line bg-card/80 p-3">
              <div className="font-heading text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Peek next
              </div>
              {nextEntry ? (
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-heading text-sm font-semibold text-white">{nextEntry.step.title}</span>
                  <span className="shrink-0 font-mono text-xs text-brand-soft">{nextEntry.projectedStart}</span>
                </div>
              ) : (
                <div className="mt-1 text-xs text-slate-400">No further steps — event complete.</div>
              )}
            </section>
          </>
        )}

        <div className="mt-auto space-y-2 pt-2">
          <HoldToConfirmButton
            onConfirm={onAdvance}
            disabled={isComplete || !canAdvance}
            label={isComplete ? 'EVENT COMPLETE ✓' : 'HOLD TO ADVANCE ➔'}
            holdLabel="hold 1.2s"
            className={`w-full rounded-2xl border px-5 py-4 text-base font-heading font-bold transition ${
              isComplete || !canAdvance
                ? 'border-line bg-card text-slate-500'
                : 'border-brand-strong bg-brand text-white shadow-lg shadow-blue-950/60 hover:bg-brand-hover active:bg-brand-active'
            }`}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              title={canUndo ? 'Undo the last stage action' : 'Nothing to undo'}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-heading font-semibold transition ${
                !canUndo
                  ? 'cursor-not-allowed border-line bg-card text-slate-600'
                  : 'border-line-strong bg-raised text-slate-200 hover:bg-line'
              }`}
            >
              ↩ Undo last action
            </button>
            <span className="flex items-center rounded-xl border border-line bg-card px-3 font-mono text-[10px] text-slate-400">
              {completedCount}/{timeline.length} done
            </span>
          </div>
        </div>
      </main>

      <footer className="border-t border-line bg-card px-3 py-2 text-center font-mono text-[10px] text-slate-500">
        Pocket view · advances the same room state as the MC tablet
      </footer>
    </div>
  );
}
