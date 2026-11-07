import logo from '../assets/img/logo.png';
import { useEffect, useState } from 'react';
import CoupleIdentity from './CoupleIdentity';
import CutoffStopwatchCard from './CutoffStopwatchCard';
import DjExportPack from './DjExportPack';
import DjNowPlayingOverlay from './DjNowPlayingOverlay';
import DjSetHealthCard from './DjSetHealthCard';
import DjSongRequestQueue from './DjSongRequestQueue';
import KeySongsCard from './KeySongsCard';
import MusicPolicyCard from './MusicPolicyCard';
import OpenOnPhoneButton from './OpenOnPhoneButton';
import ReelClock from './ReelClock';
import RoleShell from './RoleShell';
import StagePingBanner from './StagePingBanner';
import SyncStatusBadge from './SyncStatusBadge';
import TimelineFocusStack from './TimelineFocusStack';
import TopBarClock from './TopBarClock';
import TopBarRoleLabel from './TopBarRoleLabel';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import SkipLink from './SkipLink';
import { useI18n } from '../i18n/useI18n';
import {
  djDetailTier,
  getImportantSongs,
  resolveServicePackage,
} from '../lib/importantSongs';

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
  outbox = null,
  role,
  roles,
  onRoleChange,
  servicePackage,
  viewVisibility,
  theme = 'night',
  onToggleTheme,
  songRequestAccessToken = null,
  songRequestRoomCode = null,
  roomCode = null,
}) {
  const { t } = useI18n();
  const activeIndex = timeline.findIndex((entry) => entry.isActive);
  const activeEntry = activeIndex >= 0 ? timeline[activeIndex] : null;
  const nextEntry =
    activeIndex >= 0
      ? timeline[activeIndex + 1] ?? null
      : timeline.find((entry) => !entry.isDone) ?? null;
  const completedCount = timeline.filter((entry) => entry.isDone).length;
  const pingStep =
    timeline.find((entry) => entry.step.id === stagePing?.step_id)?.step ?? activeEntry?.step ?? null;

  // Key Songs card: driven by the service package and `viewVisibility.dj.music`,
  // never by role switching. VIP adds source/root, cues and the mini QR;
  // Standard and Solo only show title + artist.
  const resolvedPackage = servicePackage ?? resolveServicePackage(wedding);
  const detailTier = djDetailTier(resolvedPackage);
  const isVip = detailTier === 'vip';
  const isSolo = resolvedPackage === 'HOST_AND_DJ_SOLO';
  const tierLabel = isVip ? 'VIP' : isSolo ? 'SOLO' : 'STANDARD';
  const keySongs = getImportantSongs(wedding);
  const showKeySongs = viewVisibility?.music !== false && keySongs.length > 0;

  // Extra current-card detail for the shared focus stack. The stack owns the
  // card hierarchy and visibility counts; this body only adds DJ-specific
  // projected timing and booth cues.
  const djCurrentBody = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start justify-between gap-2 font-mono">
        <div className="rounded-lg border border-line bg-page/80 p-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">{t('dj.projected')}</div>
          <div className="text-sm font-semibold text-white">
            {activeEntry
              ? `${activeEntry.projectedStart ?? '—'}–${activeEntry.projectedEnd ?? '—'}`
              : '—'}
          </div>
        </div>
        <div className="text-right text-[10px] uppercase tracking-wider text-slate-500">
          <div>
            {t('dj.finish')} <span className="text-slate-200">{projectedFinish ?? '-'}</span>
          </div>
          <div>{t('dj.stepsDone', { done: completedCount, total: timeline.length })}</div>
        </div>
      </div>
      {activeEntry?.step.dj?.cutoff || Number.isFinite(activeEntry?.step.dj?.cutoffSec) ? (
        <div className="w-fit rounded border border-alert/60 bg-alert/20 px-1.5 py-0.5 text-[10px] font-bold text-alert-soft">
          {t('dj.cutoff')}{' '}
          {activeEntry.step.dj.cutoff ?? `start + ${activeEntry.step.dj.cutoffSec}s`}
        </div>
      ) : null}
      {activeEntry?.step.dj ? (
        <div className="flex flex-wrap gap-2 text-[11px]">
          {isVip && activeEntry.step.dj.playlist ? (
            <span className="rounded border border-line-strong bg-raised px-2 py-1 text-slate-300">
              🎵 {activeEntry.step.dj.playlist}
            </span>
          ) : null}
          {activeEntry.step.dj.track ? (
            <span className="rounded border border-brand-strong bg-brand/30 px-2 py-1 text-brand-tint">
              ▶ {activeEntry.step.dj.track}
            </span>
          ) : null}
          {isVip && activeEntry.step.dj.note ? (
            <span className="rounded border border-line-strong bg-raised px-2 py-1 text-slate-300">
              📝 {activeEntry.step.dj.note}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const [copyNotice, setCopyNotice] = useState('');
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

  const copySetList = async () => {
    const lines = timeline.map((entry) => {
      const track = entry.step.dj?.track ?? entry.step.dj?.playlist ?? entry.step.title;
      return `${entry.projectedStart ?? '--:--'}  ${track}`;
    });
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyNotice('Set list copied.');
    } catch {
      setCopyNotice('Copy failed — select the timeline manually.');
    }
    window.setTimeout(() => setCopyNotice(''), 2500);
  };

  const [isCompact, setIsCompact] = useState(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(max-width: 639px)').matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsCompact(mq.matches);
    const listener = () => setIsCompact(mq.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  // Compact (phone) read-only content: no step controls.
  const compactContent = (
    <div id="main-content" tabIndex={-1} className="space-y-4">
      <StagePingBanner key={stagePing?.id ?? 'no-ping'} ping={stagePing} step={pingStep} />

      <ReelClock clock={clock} compact />

      {isVip ? (
        <button
          type="button"
          onClick={() => setNowPlayingOpen(true)}
          className="w-full rounded-xl border border-brand-strong bg-brand/30 px-3 py-2.5 font-heading text-sm font-bold text-brand-tint transition hover:bg-brand/50"
        >
          ⛶ Fullscreen now playing
        </button>
      ) : null}

      {isVip ? (
        <DjSetHealthCard wedding={wedding} timeline={timeline} compact />
      ) : null}

      {showKeySongs ? (
        <KeySongsCard
          songs={keySongs}
          tier={detailTier}
          timeline={timeline}
          activeIndex={activeIndex}
        />
      ) : null}

      <section className="rounded-xl border border-line bg-card/95 p-4 shadow-lg">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-white">
          📋 Projected timeline
        </h2>
        <TimelineFocusStack
          compact
          className="mt-2"
          entries={timeline}
          activeIndex={activeIndex}
          currentBody={djCurrentBody}
        />
      </section>

      <CutoffStopwatchCard timeline={timeline} clock={clock} wedding={wedding} />

      <MusicPolicyCard policy={musicPolicy} />

      <DjNowPlayingOverlay
        enabled={isVip}
        open={nowPlayingOpen}
        onClose={() => setNowPlayingOpen(false)}
        activeEntry={activeEntry}
        nextEntry={nextEntry}
        keySongs={keySongs}
      />
    </div>
  );

  const wideContent = (
    <div className="flex h-screen flex-col overflow-hidden bg-page text-slate-100 antialiased select-none">
      <SkipLink />
      <header
        className={`border-b border-line bg-card px-4 py-3 ${
          isVip
            ? 'grid grid-cols-1 items-center gap-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'
            : 'flex flex-wrap items-center justify-between gap-3'
        }`}
      >
        <div className="flex items-center gap-3 xl:min-w-0">
          <div className="flex items-center justify-center rounded-lg bg-white px-2 py-1 shadow-md">
            <img src={logo} alt="Weselny Żabojad" className="h-10 w-auto object-contain" />
          </div>
          <TopBarClock clock={clock} />
          <TopBarRoleLabel role={role} tier={tierLabel} />
        </div>

        {isVip ? (
          <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
            <CoupleIdentity wedding={wedding} className="text-sm" />
            <span className="font-body text-xs font-normal text-slate-400">{wedding.date}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end xl:min-w-0">
          <SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} outbox={outbox} />
          <OpenOnPhoneButton role={role} tier={tierLabel} roomCode={roomCode} />
          <LanguageToggle />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
        </div>
      </header>

      <StagePingBanner key={stagePing?.id ?? 'no-ping'} ping={stagePing} step={pingStep} />

      <main id="main-content" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-5xl space-y-4">
          {isSolo ? (
            <div className="rounded-xl border border-brand-strong/60 bg-brand/20 px-3 py-2 text-[11px] text-brand-tint">
              <strong className="font-heading">{t('dj.soloTitle')}</strong> {t('dj.soloBody')}
              device — open the MC view for scripts and drift controls. Song detail stays at the
              Standard level.
            </div>
          ) : null}

          <ReelClock clock={clock} compact />

          {showKeySongs ? (
            <KeySongsCard
              songs={keySongs}
              tier={detailTier}
              timeline={timeline}
              activeIndex={activeIndex}
            />
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-xl border border-line bg-card/95 p-4 shadow-lg lg:col-span-2">
              <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-white">
                📋 Projected timeline
              </h2>
              <TimelineFocusStack
                className="mt-3"
                entries={timeline}
                activeIndex={activeIndex}
                currentBody={djCurrentBody}
              />
            </section>

            <aside className="space-y-4">
              <CutoffStopwatchCard timeline={timeline} clock={clock} wedding={wedding} />

              {isVip ? (
                <DjSetHealthCard wedding={wedding} timeline={timeline} />
              ) : null}

              <MusicPolicyCard policy={musicPolicy} />

              {isVip ? (
                <section className="rounded-xl border border-brand-strong/50 bg-card/95 p-4 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-brand-soft">
                      🎛️ VIP booth cues
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setNowPlayingOpen(true)}
                        className="rounded border border-brand-strong bg-brand/30 px-2 py-0.5 text-[10px] font-semibold text-brand-tint transition hover:bg-brand/50"
                      >
                        ⛶ Fullscreen
                      </button>
                      <button
                        type="button"
                        onClick={copySetList}
                        className="rounded border border-brand-strong bg-brand/30 px-2 py-0.5 text-[10px] font-semibold text-brand-tint transition hover:bg-brand/50"
                      >
                        Copy set list
                      </button>
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1.5 text-[11px] text-slate-400">
                    <li>Playlist, track, notes and cutoff details are unlocked.</li>
                    <li>Key Songs include source/root, cues and the mini QR.</li>
                    <li>Red cutoffs are hard stops — fade before the stated time.</li>
                  </ul>
                  {copyNotice ? (
                    <p className="mt-1 text-[10px] text-emerald-300" aria-live="polite">
                      {copyNotice}
                    </p>
                  ) : null}
                </section>
              ) : null}

              {isVip ? (
                <DjSongRequestQueue
                  enabled={isVip}
                  role={role}
                  accessToken={songRequestAccessToken}
                  roomCode={songRequestRoomCode}
                />
              ) : null}

              <DjExportPack enabled={isVip} wedding={wedding} timeline={timeline} />

              <section className="rounded-xl border border-line bg-card/95 p-4 shadow-lg">
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

      <footer className="border-t border-line bg-card px-4 py-2 text-center font-mono text-[11px] text-slate-500">
        Read-only DJ view · no step controls · syncs with the host over the room PIN
      </footer>

      <DjNowPlayingOverlay
        enabled={isVip}
        open={nowPlayingOpen}
        onClose={() => setNowPlayingOpen(false)}
        activeEntry={activeEntry}
        nextEntry={nextEntry}
        keySongs={keySongs}
      />
    </div>
  );

  if (!isCompact) {
    return wideContent;
  }

  return (
    <RoleShell
      compact
      role={role}
      roles={roles}
      syncStatus={syncStatus}
      syncError={syncError}
      remoteUpdatedAt={remoteUpdatedAt}
      outbox={outbox}
      onToggleTheme={onToggleTheme}
      theme={theme}
      onRoleChange={onRoleChange}
    >
      {compactContent}
    </RoleShell>
  );
}
