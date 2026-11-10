import { Suspense, lazy } from 'react';
import { clockToEventDate, formatCountdown, resolveEventDateISO } from '../lib/eventTime.js';
import logo from '../assets/img/logo.png';
import ChildrenExpectedBadge from './ChildrenExpectedBadge';
import CulturalRulesBar from './CulturalRulesBar';
import DjSongRequestQueue from './DjSongRequestQueue';
import FirstDanceCueCard from './FirstDanceCueCard';
import MusicPolicyCard from './MusicPolicyCard';
import useCompact from '../hooks/useCompact';
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
import { djCapabilities } from '../lib/djCapabilities.js';

// Build-time dev gate: production replaces this with `null` and drops the
// dynamic import, its chunk and all simulator strings.
const SongRequestSimulator = import.meta.env.DEV
  ? lazy(() => import('../dev/SongRequestSimulator.jsx'))
  : null;

export function DjSetCountdown({ wedding, clock, nextEntry }) {
  const { t } = useI18n();
  if (!nextEntry?.projectedStart) return null;

  const now = clock?.now instanceof Date ? clock.now : new Date();
  const nextAt = clockToEventDate({
    clock: nextEntry.projectedStart,
    eventDateISO: resolveEventDateISO(wedding),
    timeZone: clock?.timeZone ?? null,
    after: now,
  });
  if (!nextAt) return null;

  const seconds = Math.round((nextAt.getTime() - now.getTime()) / 1000);
  const urgent = seconds <= 360;
  return (
    <div
      role="timer"
      aria-live="off"
      className={`flex w-fit flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
        urgent
          ? 'animate-pulse border-alert bg-alert/20 text-alert-soft motion-reduce:animate-none'
          : 'border-line bg-page/80 text-ink'
      }`}
    >
      <span className="text-[10px] uppercase tracking-wider text-muted">
        {t('dj.set.nextStepIn')}
      </span>
      <span className="font-mono text-lg font-bold">{formatCountdown(seconds)}</span>
      <span className="text-[10px] text-muted">{nextEntry.step?.title ?? ''}</span>
    </div>
  );
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
}) {
  const { t } = useI18n();
  const activeIndex = timeline.findIndex((entry) => entry.isActive);
  const activeEntry = activeIndex >= 0 ? timeline[activeIndex] : null;
  const nextEntry =
    activeIndex >= 0
      ? timeline.slice(activeIndex + 1).find((entry) => !entry.isDone) ?? null
      : null;
  const isDjSet = activeEntry?.step?.optionalFlag === 'dj_set';
  const completedCount = timeline.filter((entry) => entry.isDone).length;

  const resolvedPackage = servicePackage ?? resolveServicePackage(wedding);
  const detailTier = djDetailTier({ ...wedding, servicePackage: resolvedPackage });
  const caps = djCapabilities(detailTier);
  const isSolo = resolvedPackage === 'HOST_AND_DJ_SOLO';
  const tierLabel = caps.vip ? 'VIP' : isSolo ? 'SOLO' : 'STANDARD';
  const importantSongs = getImportantSongs(wedding);
  const mainSong = activeEntry
    ? importantSongs.find((song) => song.stepId === activeEntry.step.id) ?? null
    : null;
  const mainSongRequired = activeEntry?.step?.isMainSongRequired === true;
  const mandatoryByStep = mapMandatoryToSteps(
    wedding,
    timeline.map((entry) => entry?.step).filter(Boolean),
    { role: 'dj', isVipDj: caps.vip },
  );
  const mandatoryItems = activeEntry?.step?.id ? mandatoryByStep[activeEntry.step.id] ?? [] : [];

  // Extra current-card detail for the shared focus stack. The stack owns the
  // card hierarchy and visibility counts; this body only adds DJ-specific
  // projected timing and booth cues.
  const djCurrentBody = (
    <div className="flex flex-col gap-2">
      {caps.vip && isDjSet && nextEntry ? (
        <DjSetCountdown wedding={wedding} clock={clock} nextEntry={nextEntry} />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-2 font-mono">
        <div className="rounded-lg border border-line bg-page/80 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted">{t('dj.projected')}</div>
          <div className="text-sm font-semibold text-ink">
            {activeEntry
              ? `${activeEntry.projectedStart ?? '—'}–${activeEntry.projectedEnd ?? '—'}`
              : '—'}
          </div>
        </div>
        <div className="text-right text-[10px] uppercase tracking-wider text-muted">
          <div>
            {t('dj.finish')} <span className="text-ink">{projectedFinish ?? '-'}</span>
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
      {caps.boothCues &&
      (activeEntry?.step?.optionalFlag === 'oczepiny' ||
        /oczepiny/i.test(activeEntry?.step?.title ?? '')) ? (
        <OczepinyCueCard wedding={wedding} audience="dj-vip" />
      ) : null}
      {caps.boothCues && activeEntry?.step?.firstDanceMode ? (
        <FirstDanceCueCard step={activeEntry.step} audience="dj-vip" />
      ) : null}
      <StepMandatoryNotes items={mandatoryItems} />
      {mainSongRequired ? (
        <div className="rounded-lg border border-brand-strong/50 bg-brand/10 p-2 text-[11px]">
          <div className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
            {t('dj.mainSong')}
          </div>
          {mainSong ? (
            <div className="mt-0.5 text-ink">
              <strong className="text-ink">{mainSong.title ?? 'Untitled'}</strong>
              {mainSong.artist ? <span className="text-muted"> — {mainSong.artist}</span> : null}
            </div>
          ) : (
            <div className="mt-0.5 text-amber-200">{t('music.mainSongMissing')}</div>
          )}
        </div>
      ) : null}
    </div>
  );

  const isCompact = useCompact();

  // Compact (phone) read-only content: no step controls.
  const compactContent = (
    <div id="main-content" tabIndex={-1} className="space-y-4">
      {caps.guestRequests ? (
        <DjSongRequestQueue
          enabled={caps.guestRequests}
          variant="bar"
          role={role}
          accessToken={songRequestAccessToken}
          roomCode={songRequestRoomCode}
          discoPoloPolicy={musicPolicy?.discoPoloPolicy ?? 'NO'}
        />
      ) : null}
      {caps.devSimulator && SongRequestSimulator ? (
        <Suspense fallback={null}>
          <SongRequestSimulator />
        </Suspense>
      ) : null}


      <TimelineFocusStack
        compact
        zoneScroll={false}
        entries={timeline}
        activeIndex={activeIndex}
        currentBody={djCurrentBody}
      />

      {caps.musicPolicy ? <MusicPolicyCard policy={musicPolicy} /> : null}
    </div>
  );

  const wideContent = (
    <div className="flex min-h-dvh flex-col bg-page text-ink antialiased">
      <SkipLink />
      <div className="sticky top-0 z-banner">
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
        center={<TopBarCenterIdentity wedding={wedding} showCoupleLanguages={caps.coupleLanguages} />}
        right={(
          <>
            {caps.culturalChips && culturalRules ? (
              <CulturalRulesBar rules={culturalRules} oczepinyStatus={oczepinyStatus} />
            ) : null}
            {caps.speeches ? (
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
            {caps.vipAuth && authControl ? authControl : null}
          </>
        )}
        center={(
          <ChildrenExpectedBadge wedding={wedding} inline />
        )}
        right={(
          <>
            <OpenOnPhoneButton role={role} tier={tierLabel} roomCode={roomCode} />
            <LanguageToggle />
            <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
          </>
        )}
      />

      {caps.guestRequests ? (
        <DjSongRequestQueue
          enabled={caps.guestRequests}
          variant="bar"
          role={role}
          accessToken={songRequestAccessToken}
          roomCode={songRequestRoomCode}
          discoPoloPolicy={musicPolicy?.discoPoloPolicy ?? 'NO'}
        />
      ) : null}
      {caps.devSimulator && SongRequestSimulator ? (
        <Suspense fallback={null}>
          <SongRequestSimulator />
        </Suspense>
      ) : null}
      </div>

      <main id="main-content" tabIndex={-1} className="flex-1 p-4">
        <div className="w-full space-y-4">
          {isSolo ? (
            <div className="rounded-xl border border-brand-strong/60 bg-brand/20 px-3 py-2 text-[11px] text-brand-tint">
              <strong className="font-heading">{t('dj.soloTitle')}</strong> {t('dj.soloBody')}
              device — open the MC view for scripts and drift controls. Song detail stays at the
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
            {caps.musicPolicy ? (
              <div className="space-y-4 lg:col-span-2">
                <MusicPolicyCard policy={musicPolicy} />
              </div>
            ) : null}
            <aside className={`space-y-4${caps.musicPolicy ? '' : ' lg:col-span-3'}`}>
              <section className="rounded-xl border border-line bg-card/95 p-4 shadow-lg">
                <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-ink">
                  {t('dj.setNotes')}
                </h2>
                <ul className="mt-2 space-y-1.5 text-[11px] text-muted">
                  <li>{t('dj.setNotes.project')}</li>
                  <li>{t('dj.setNotes.cutoffs')}</li>
                  <li>{t('dj.setNotes.private')}</li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </main>

      <footer className="border-t border-line bg-card px-4 py-2 text-center font-mono text-[11px] text-muted">
        {t('dj.footer')}
      </footer>
    </div>
  );

  if (!isCompact) {
    return wideContent;
  }

  if (!caps.pocket) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-page px-4 text-center text-ink">
        <section className="max-w-sm rounded-2xl border border-line bg-card p-6 shadow-2xl">
          <div className="text-3xl" aria-hidden="true">💻</div>
          <h1 className="mt-2 font-heading text-lg font-bold text-ink">
            {t('dj.laptopRequiredTitle')}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {t('dj.laptopRequiredBody')}
          </p>
          <div className="mt-3 flex justify-center">
            <ChildrenExpectedBadge wedding={wedding} compact />
          </div>
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
      culturalRules={caps.culturalChips ? culturalRules : null}
      oczepinyStatus={oczepinyStatus}
      speeches={caps.speeches ? speeches : null}
      speechMode={caps.speeches ? speechMode : null}
      activeSpeechId={activeSpeechId}
      authControl={caps.vipAuth ? authControl : null}
    >
      {compactContent}
    </RoleShell>
  );
}
