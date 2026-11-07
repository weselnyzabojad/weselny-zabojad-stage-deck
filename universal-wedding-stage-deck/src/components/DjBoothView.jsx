import logo from '../assets/img/logo.png';
import { useEffect, useState } from 'react';
import CulturalRulesBar from './CulturalRulesBar';
import DjSongRequestQueue from './DjSongRequestQueue';
import FirstDanceCueCard from './FirstDanceCueCard';
import MusicPolicyCard from './MusicPolicyCard';
import OczepinyCueCard from './OczepinyCueCard';
import OpenOnPhoneButton from './OpenOnPhoneButton';
import RoleShell from './RoleShell';
import SecondaryControlBar from './SecondaryControlBar';
import StepMandatoryNotes from './StepMandatoryNotes';
import { mapMandatoryToSteps } from '../lib/mandatorySteps.js';
import SpeechesChip from './SpeechesChip';
import SyncStatusBadge from './SyncStatusBadge';
import TimelineFocusStack from './TimelineFocusStack';
import TopBarCenterIdentity from './TopBarCenterIdentity';
import TopBarClock from './TopBarClock';
import TopBarRoleIdentity from './TopBarRoleIdentity';
import TopBarShell from './TopBarShell';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import SkipLink from './SkipLink';
import { useI18n } from '../i18n/useI18n';
import { djDetailTier, getImportantSongs, resolveServicePackage } from '../lib/importantSongs';

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
  pin = null,
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
  mandatoryOverride = null,
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
  const importantSongs = getImportantSongs(wedding);
  const mainSong = activeEntry
    ? importantSongs.find((song) => song.stepId === activeEntry.step.id) ?? null
    : null;
  const mainSongRequired = activeEntry?.step?.isMainSongRequired === true;
  const mandatoryByStep = mapMandatoryToSteps(
    wedding,
    timeline.map((entry) => entry?.step).filter(Boolean),
    { role: 'dj', isVipDj: isVip, override: mandatoryOverride },
  );
  const mandatoryItems = activeEntry?.step?.id ? mandatoryByStep[activeEntry.step.id] ?? [] : [];

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
      {isVip &&
      (activeEntry?.step?.optionalFlag === 'oczepiny' ||
        /oczepiny/i.test(activeEntry?.step?.title ?? '')) ? (
        <OczepinyCueCard wedding={wedding} audience="dj-vip" />
      ) : null}
      {isVip && activeEntry?.step?.firstDanceMode ? (
        <FirstDanceCueCard step={activeEntry.step} audience="dj-vip" />
      ) : null}
      <StepMandatoryNotes items={mandatoryItems} />
      {mainSongRequired ? (
        <div className="rounded-lg border border-brand-strong/50 bg-brand/10 p-2 text-[11px]">
          <div className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
            Main song
          </div>
          {mainSong ? (
            <div className="mt-0.5 text-slate-200">
              <strong className="text-white">{mainSong.title ?? 'Untitled'}</strong>
              {mainSong.artist ? <span className="text-slate-400"> — {mainSong.artist}</span> : null}
            </div>
          ) : (
            <div className="mt-0.5 text-amber-200">Main song not set for this step.</div>
          )}
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

      {isVip ? <MusicPolicyCard policy={musicPolicy} /> : null}
    </div>
  );

  const wideContent = (
    <div className="flex min-h-screen flex-col bg-page text-slate-100 antialiased select-none">
      <SkipLink />
      <div className="sticky top-0 z-30">
      <TopBarShell
        left={(
          <>
            <div className="flex items-center justify-center rounded-lg bg-white px-2 py-1 shadow-md">
              <img src={logo} alt="Weselny Żabojad" className="h-12 w-auto object-contain" />
            </div>
            <TopBarClock clock={clock} />
            <TopBarRoleIdentity role={role} tier={tierLabel} />
          </>
        )}
        center={<TopBarCenterIdentity wedding={wedding} showCoupleLanguages={isVip} />}
        right={(
          <>
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
            {viewSwitch}
          </>
        )}
      />

      <SecondaryControlBar
        left={(
          <>
            <SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} outbox={outbox} />
            {isVip && authControl ? authControl : null}
          </>
        )}
        right={(
          <>
            <OpenOnPhoneButton role={role} tier={tierLabel} roomCode={roomCode} />
            <LanguageToggle />
            <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
          </>
        )}
      />

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
        <div className="w-full space-y-4">
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
            {isVip ? (
              <div className="space-y-4 lg:col-span-2">
                <MusicPolicyCard policy={musicPolicy} />
              </div>
            ) : null}
            <aside className={`space-y-4${isVip ? '' : ' lg:col-span-3'}`}>
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

  if (!isVip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-4 text-center text-slate-100">
        <section className="max-w-sm rounded-2xl border border-line bg-card p-6 shadow-2xl">
          <div className="text-3xl" aria-hidden="true">💻</div>
          <h1 className="mt-2 font-heading text-lg font-bold text-white">
            {t('dj.laptopRequiredTitle')}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            {t('dj.laptopRequiredBody')}
          </p>
        </section>
      </div>
    );
  }

  return (
    <RoleShell
      compact
      role={role}
      clock={clock}
      pin={pin}
      wedding={wedding}
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
