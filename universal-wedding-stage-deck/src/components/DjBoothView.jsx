import logo from '../assets/img/logo.png';
import { useEffect, useState } from 'react';
import CoupleIdentity from './CoupleIdentity';
import CulturalRulesBar from './CulturalRulesBar';
import DjSongRequestQueue from './DjSongRequestQueue';
import MusicPolicyCard from './MusicPolicyCard';
import OpenOnPhoneButton from './OpenOnPhoneButton';
import RoleShell from './RoleShell';
import SpeechesChip from './SpeechesChip';
import SyncStatusBadge from './SyncStatusBadge';
import TimelineFocusStack from './TimelineFocusStack';
import TopBarClock from './TopBarClock';
import TopBarRoleIdentity from './TopBarRoleIdentity';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import SkipLink from './SkipLink';
import { useI18n } from '../i18n/useI18n';
import { djDetailTier, resolveServicePackage } from '../lib/importantSongs';

// Read-only companion screen for the DJ: projected timeline, playlists, track
// titles and hard cutoffs only. There are deliberately no step controls, no MC
// scripts and no VIP/family notes in this view.
export default function DjBoothView({
  wedding,
  timeline,
  projectedFinish,
  clock,
  musicPolicy,
  syncStatus,
  syncError,
  remoteUpdatedAt,
  outbox = null,
  role,
  roles,
  onRoleChange,
  servicePackage,
  theme = 'night',
  onToggleTheme,
  songRequestAccessToken = null,
  songRequestRoomCode = null,
  roomCode = null,
  viewSwitch = null,
  culturalRules = null,
  oczepinyStatus = null,
  speeches = [],
  speechMode = 'OFF',
  activeSpeechId = null,
  authControl = null,
}) {
  const { t } = useI18n();
  const activeIndex = timeline.findIndex((entry) => entry.isActive);
  const activeEntry = activeIndex >= 0 ? timeline[activeIndex] : null;
  const completedCount = timeline.filter((entry) => entry.isDone).length;

  const resolvedPackage = servicePackage ?? resolveServicePackage(wedding);
  const detailTier = djDetailTier(resolvedPackage);
  const isVip = detailTier === 'vip';
  const isSolo = resolvedPackage === 'HOST_AND_DJ_SOLO';
  const tierLabel = isVip ? 'VIP' : isSolo ? 'SOLO' : 'STANDARD';

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
              ? `${activeEntry.projectedStart ?? 'â€”'}â€“${activeEntry.projectedEnd ?? 'â€”'}`
              : 'â€”'}
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
              đźŽµ {activeEntry.step.dj.playlist}
            </span>
          ) : null}
          {activeEntry.step.dj.track ? (
            <span className="rounded border border-brand-strong bg-brand/30 px-2 py-1 text-brand-tint">
              â–¶ {activeEntry.step.dj.track}
            </span>
          ) : null}
          {isVip && activeEntry.step.dj.note ? (
            <span className="rounded border border-line-strong bg-raised px-2 py-1 text-slate-300">
              đź“ť {activeEntry.step.dj.note}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );

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
      {isVip ? (
        <DjSongRequestQueue
          enabled={isVip}
          variant="bar"
          role={role}
          accessToken={songRequestAccessToken}
          roomCode={songRequestRoomCode}
        />
      ) : null}


      <TimelineFocusStack
        compact
        zoneScroll={false}
        entries={timeline}
        activeIndex={activeIndex}
        currentBody={djCurrentBody}
      />

      <MusicPolicyCard policy={musicPolicy} />
    </div>
  );

  const wideContent = (
    <div className="flex min-h-screen flex-col bg-page text-slate-100 antialiased select-none">
      <SkipLink />
      <div className="sticky top-0 z-30">
      <header
        className={`border-b border-line bg-card px-4 py-3 ${
          isVip
            ? 'grid grid-cols-1 items-center gap-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'
            : 'flex flex-wrap items-center justify-between gap-3'
        }`}
      >
        <div className="flex items-center gap-3 xl:min-w-0">
          <div className="flex items-center justify-center rounded-lg bg-white px-2 py-1 shadow-md">
            <img src={logo} alt="Weselny Ĺ»abojad" className="h-10 w-auto object-contain" />
          </div>
          <TopBarClock clock={clock} />
          <TopBarRoleIdentity role={role} tier={tierLabel} />
        </div>

        {isVip ? (
          <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
            <CoupleIdentity wedding={wedding} className="text-sm" />
            <span className="font-body text-xs font-normal text-slate-400">{wedding.date}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end xl:min-w-0">
          {isVip && culturalRules ? (
            <CulturalRulesBar rules={culturalRules} oczepinyStatus={oczepinyStatus} />
          ) : null}
          {isVip ? (
            <SpeechesChip
              mode={speechMode}
              speeches={speeches}
              activeSpeechId={activeSpeechId}
            />
          ) : null}
          <SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} outbox={outbox} />
          <OpenOnPhoneButton role={role} tier={tierLabel} roomCode={roomCode} />
          {viewSwitch}
          {isVip && authControl ? authControl : null}
          <LanguageToggle />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
        </div>
      </header>

      {isVip ? (
        <DjSongRequestQueue
          enabled={isVip}
          variant="bar"
          role={role}
          accessToken={songRequestAccessToken}
          roomCode={songRequestRoomCode}
        />
      ) : null}
      </div>

      <main id="main-content" tabIndex={-1} className="flex-1 p-4">
        <div className="mx-auto max-w-5xl space-y-4">
          {isSolo ? (
            <div className="rounded-xl border border-brand-strong/60 bg-brand/20 px-3 py-2 text-[11px] text-brand-tint">
              <strong className="font-heading">{t('dj.soloTitle')}</strong> {t('dj.soloBody')}
              device â€” open the MC view for scripts and drift controls. Song detail stays at the
              Standard level.
            </div>
          ) : null}


          <TimelineFocusStack
            zoneScroll={false}
            entries={timeline}
            activeIndex={activeIndex}
            currentBody={djCurrentBody}
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <MusicPolicyCard policy={musicPolicy} />
            </div>
            <aside className="space-y-4">
              <section className="rounded-xl border border-line bg-card/95 p-4 shadow-lg">
                <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-white">
                  đźŽšď¸Ź Set notes
                </h2>
                <ul className="mt-2 space-y-1.5 text-[11px] text-slate-400">
                  <li>Follow the projected times; the host advances the live state.</li>
                  <li>Red cutoffs are hard stops â€” fade before the stated time.</li>
                  <li>This view never exposes MC scripts or family alerts.</li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </main>

      <footer className="border-t border-line bg-card px-4 py-2 text-center font-mono text-[11px] text-slate-500">
        Read-only DJ view Â· no step controls Â· syncs with the host over the room PIN
      </footer>
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
      viewSwitch={viewSwitch}
      culturalRules={isVip ? culturalRules : null}
      oczepinyStatus={oczepinyStatus}
      speeches={isVip ? speeches : null}
      speechMode={isVip ? speechMode : null}
      activeSpeechId={activeSpeechId}
      authControl={isVip ? authControl : null}
    >
      {compactContent}
    </RoleShell>
  );
}
