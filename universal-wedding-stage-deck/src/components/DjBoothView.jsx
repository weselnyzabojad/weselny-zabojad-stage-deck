import logo from '../assets/img/logo.png';
import CoupleIdentity from './CoupleIdentity';
import KeySongsCard from './KeySongsCard';
import MusicPolicyCard from './MusicPolicyCard';
import ReelClock from './ReelClock';
import RoleSwitcher from './RoleSwitcher';
import StagePingBanner from './StagePingBanner';
import SyncStatusBadge from './SyncStatusBadge';
import {
  djDetailTier,
  getImportantSongs,
  resolveServicePackage,
} from '../lib/importantSongs';

const STATUS_CHIPS = {
  done: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
  active: 'border-[#3b5bdb] bg-[#002395]/40 text-[#b8c6ff] animate-pulse',
  next: 'border-amber-800 bg-amber-950/60 text-amber-200',
  later: 'border-[#2b3d73] bg-[#111d3b] text-slate-400',
};

function statusFor(entry, activeIndex) {
  if (entry.isDone) return { key: 'done', label: 'DONE' };
  if (entry.isActive) return { key: 'active', label: 'ON AIR' };
  if (entry.index === activeIndex + 1) return { key: 'next', label: 'NEXT' };
  return { key: 'later', label: 'PLANNED' };
}

// Read-only companion screen for the DJ: projected timeline, playlists, track
// titles and hard cutoffs only. There are deliberately no step controls, no MC
// scripts and no VIP/family notes in this view.
export default function DjBoothView({
  wedding,
  timeline,
  projectedFinish,
  clock,
  musicPolicy,
  stagePing,
  syncStatus,
  syncError,
  remoteUpdatedAt,
  role,
  roles,
  onRoleChange,
  servicePackage,
  viewVisibility,
}) {
  const activeIndex = timeline.findIndex((entry) => entry.isActive);
  const activeEntry = activeIndex >= 0 ? timeline[activeIndex] : null;
  const cutoffs = timeline.filter((entry) => entry.step.dj?.cutoff);
  const completedCount = timeline.filter((entry) => entry.isDone).length;
  const pingStep =
    timeline.find((entry) => entry.step.id === stagePing?.step_id)?.step ?? activeEntry?.step ?? null;

  // Key Songs card: driven by the service package and `viewVisibility.dj.music`,
  // never by role switching. VIP adds source/root, cues and the mini QR;
  // Standard and Solo only show title + artist.
  const detailTier = djDetailTier(servicePackage ?? resolveServicePackage(wedding));
  const keySongs = getImportantSongs(wedding);
  const showKeySongs = viewVisibility?.music !== false && keySongs.length > 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#070b19] text-slate-100 antialiased select-none">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1c2a52] bg-[#0b132b] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg bg-white px-2 py-1 shadow-md">
            <img src={logo} alt="Weselny Żabojad" className="h-10 w-auto object-contain" />
          </div>
          <div>
            <div className="font-heading text-[10px] font-semibold uppercase tracking-[0.25em] text-[#849dff]">
              🎧 DJ Booth · read-only
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CoupleIdentity wedding={wedding} className="text-sm" />
              <span className="font-body text-xs font-normal text-slate-400">{wedding.date}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} />
          <RoleSwitcher role={role} roles={roles} onChange={onRoleChange} />
        </div>
      </header>

      <StagePingBanner key={stagePing?.id ?? 'no-ping'} ping={stagePing} step={pingStep} />

      <main className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-5xl space-y-4">
          <ReelClock clock={clock} compact />

          <section className="rounded-xl border border-[#1c2a52] bg-[#0b132b] p-4 shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="font-heading text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  {activeEntry ? 'Now on stage' : 'Event complete'}
                </span>
                <h1 className="mt-1 font-heading text-2xl font-bold text-white">
                  {activeEntry ? activeEntry.step.title : 'All steps complete'}
                </h1>
                <div className="mt-1 text-xs text-slate-400">
                  📍 {activeEntry?.step.location ?? '—'} · {completedCount}/{timeline.length} steps done
                </div>
              </div>

              <div className="rounded-lg border border-[#1c2a52] bg-[#070b19]/80 p-3 text-right font-mono">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Projected</div>
                <div className="text-lg font-semibold text-white">
                  {activeEntry
                    ? `${activeEntry.projectedStart ?? '—'}–${activeEntry.projectedEnd ?? '—'}`
                    : '—'}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
                  Finish <span className="text-slate-200">{projectedFinish ?? '—'}</span>
                </div>
                {activeEntry?.step.dj?.cutoff ? (
                  <div className="mt-1 rounded border border-[#ED2939]/60 bg-[#ED2939]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#ff808a]">
                    CUTOFF {activeEntry.step.dj.cutoff}
                  </div>
                ) : null}
              </div>
            </div>

            {activeEntry?.step.dj ? (
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                {activeEntry.step.dj.playlist ? (
                  <span className="rounded border border-[#2b3d73] bg-[#111d3b] px-2 py-1 text-slate-300">
                    🎵 {activeEntry.step.dj.playlist}
                  </span>
                ) : null}
                {activeEntry.step.dj.track ? (
                  <span className="rounded border border-[#3b5bdb] bg-[#002395]/30 px-2 py-1 text-[#b8c6ff]">
                    ▶ {activeEntry.step.dj.track}
                  </span>
                ) : null}
              </div>
            ) : null}
          </section>

          {showKeySongs ? (
            <KeySongsCard
              songs={keySongs}
              tier={detailTier}
              timeline={timeline}
              activeIndex={activeIndex}
            />
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-xl border border-[#1c2a52] bg-[#0b132b]/95 p-4 shadow-lg lg:col-span-2">
              <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-white">
                📋 Projected timeline
              </h2>
              <ol className="mt-3 space-y-2">
                {timeline.map((entry) => {
                  const status = statusFor(entry, activeIndex);
                  return (
                    <li
                      key={entry.step.id}
                      className={`rounded-lg border p-3 ${
                        entry.isActive
                          ? 'border-[#3b5bdb] bg-[#002395]/20'
                          : 'border-[#1c2a52] bg-[#070b19]/60'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-mono text-[10px] text-slate-500">
                            Step {entry.index + 1} · {entry.step.type.replaceAll('_', ' ')}
                          </div>
                          <div className="font-heading text-sm font-semibold text-white">
                            {entry.step.title}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            📍 {entry.step.location} · {entry.step.durationMin} min
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 font-mono">
                          <span className="text-sm text-white">
                            {entry.projectedStart ?? '—'}–{entry.projectedEnd ?? '—'}
                          </span>
                          {entry.projectedDriftMinutes ? (
                            <span
                              title={`Projected ${entry.driftLabel ?? 'drift'} vs plan`}
                              className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                                entry.projectedDriftMinutes > 0
                                  ? 'border-[#ED2939]/60 bg-[#ED2939]/20 text-[#ff808a]'
                                  : 'border-emerald-700 bg-emerald-950/60 text-emerald-300'
                              }`}
                            >
                              {entry.projectedDriftMinutes > 0
                                ? `+${entry.projectedDriftMinutes}m`
                                : `${Math.abs(entry.projectedDriftMinutes)}m ahead`}
                            </span>
                          ) : null}
                          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${STATUS_CHIPS[status.key]}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        {entry.step.dj?.playlist ? (
                          <span className="rounded border border-[#2b3d73] bg-[#111d3b] px-2 py-0.5 text-slate-300">
                            🎵 {entry.step.dj.playlist}
                          </span>
                        ) : null}
                        {entry.step.dj?.track ? (
                          <span className="rounded border border-[#1c2a52] bg-[#070b19] px-2 py-0.5 text-slate-300">
                            ▶ {entry.step.dj.track}
                          </span>
                        ) : null}
                        {entry.step.dj?.cutoff ? (
                          <span className="rounded border border-[#ED2939]/60 bg-[#ED2939]/20 px-2 py-0.5 font-mono font-bold text-[#ff808a]">
                            CUTOFF {entry.step.dj.cutoff}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            <aside className="space-y-4">
              <section className="rounded-xl border border-[#ED2939]/40 bg-[#0b132b]/95 p-4 shadow-lg">
                <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-[#ff808a]">
                  🚨 Hard cutoffs
                </h2>
                {cutoffs.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-400">No hard cutoffs in this cartridge.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {cutoffs.map((entry) => {
                      const urgent = entry.isActive || entry.index === activeIndex + 1;
                      return (
                        <li
                          key={entry.step.id}
                          className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 text-xs ${
                            urgent
                              ? 'animate-pulse border-[#ED2939]/70 bg-[#ED2939]/20 text-[#ffb3ba]'
                              : 'border-[#1c2a52] bg-[#070b19] text-slate-300'
                          }`}
                        >
                          <span className="min-w-0 truncate">{entry.step.title}</span>
                          <span className="shrink-0 font-mono font-bold">
                            {entry.step.dj.cutoff}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <MusicPolicyCard policy={musicPolicy} />

              <section className="rounded-xl border border-[#1c2a52] bg-[#0b132b]/95 p-4 shadow-lg">
                <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-white">
                  🎚️ Set notes
                </h2>
                <ul className="mt-2 space-y-1.5 text-[11px] text-slate-400">
                  <li>Follow the projected times; the host advances the live state.</li>
                  <li>Red cutoffs are hard stops — fade before the stated time.</li>
                  <li>This view never exposes MC scripts or family alerts.</li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#1c2a52] bg-[#0b132b] px-4 py-2 text-center font-mono text-[11px] text-slate-500">
        Read-only DJ view · no step controls · syncs with the host over the room PIN
      </footer>
    </div>
  );
}
