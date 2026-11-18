import { clockToEventDate, formatCountdown, resolveEventDateISO } from '../lib/eventTime.js';
import ChildrenExpectedBadge from './ChildrenExpectedBadge';
import CulturalRulesBar from './CulturalRulesBar';
import DjPolicyPanel from './DjPolicyPanel';
import DjSongRequestQueue from './DjSongRequestQueue';
import DjSetNotesNotepad from './DjSetNotesNotepad';
import VenuePolicyWarnings from './VenuePolicyWarnings';
import useVenuePolicies from '../hooks/useVenuePolicies.js';
import EndHoursCard from './EndHoursCard';
import FirstDanceCueCard from './FirstDanceCueCard';
import MusicPolicyCard, { DoNotPlayPills, MainSongPills, MustPlayPills } from './MusicPolicyCard';
import { ceremonySubStepBodies } from './ceremonySubStepBodies';
import MusicianPreferredMusic from './MusicianPreferredMusic';
import useMusicianSuggestions from '../hooks/useMusicianSuggestions';
import MusicalSetBar from './MusicalSetBar';
import useCompact from '../hooks/useCompact';
import { useReadReceipt } from '../hooks/useReadReceipt';
import OczepinyCueCard from './OczepinyCueCard';
import OpenOnPhoneButton from './OpenOnPhoneButton';
import RoleShell from './RoleShell';
import SecondaryControlBar from './SecondaryControlBar';
import StepMandatoryNotes from './StepMandatoryNotes';
import { mapMandatoryToSteps } from '../lib/mandatorySteps.js';
import SpeechSummaryChip from './SpeechSummaryChip';
import SyncStatusBadge from './SyncStatusBadge';
import TimelineFocusStack from './TimelineFocusStack';
import TopBarCenterIdentity from './TopBarCenterIdentity';
import TopBarClock from './TopBarClock';
import TopBarRoleIdentity from './TopBarRoleIdentity';
import TopBarLogo from './TopBarLogo';
import TopBarShell from './TopBarShell';
import UtilityControlGroup from './UtilityControlGroup';
import ActiveVendorsBar from './ActiveVendorsBar';
import VipDjLogo from './VipDjLogo';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';
import SkipLink from './SkipLink';
import { useI18n } from '../i18n/useI18n';
import { djDetailTier, getImportantSongs, resolveServicePackage } from '../lib/importantSongs';
import { djCapabilities } from '../lib/djCapabilities.js';

export function DjSetCountdown({ wedding, clock, nextEntry }) {
  const { t } = useI18n();
  if (!nextEntry?.projectedStart) return null;

  const now = clock?.now instanceof Date ? clock.now : null;
  if (!now) return null;
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
  flash = null,
  receiptTarget = null,
  receiptClient = null,
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
  authControl = null,
  onExtendMusicalSet = null,
  extensionAllowed = false,
  extensionUntil = null,
  closureTime = null,
  extensionBlockedReason = null,
  scheduleBanner = null,
  venuePolicies = null,
}) {
  const { t } = useI18n();
  useReadReceipt({
    stepId: receiptTarget?.stepId,
    revision: receiptTarget?.revision,
    enabled: Boolean(receiptTarget && receiptClient),
    client: receiptClient,
  });
  const activeIndex = timeline.findIndex((entry) => entry.isActive);
  const activeEntry = activeIndex >= 0 ? timeline[activeIndex] : null;
  const nextEntry =
    activeIndex >= 0
      ? timeline.slice(activeIndex + 1).find((entry) => !entry.isDone) ?? null
      : null;
  const isDjSet = activeEntry?.step?.optionalFlag === 'dj_set';
  const completedCount = timeline.filter((entry) => entry.isDone).length;
  const venueGuard = useVenuePolicies(activeEntry?.step?.tags, venuePolicies);

  const resolvedPackage = servicePackage ?? resolveServicePackage(wedding);
  const detailTier = djDetailTier({ ...wedding, servicePackage: resolvedPackage });
  const caps = djCapabilities(detailTier);
  const musicianSuggestions = useMusicianSuggestions({
    accessToken: caps.vip ? songRequestAccessToken : null,
    enabled: caps.vip,
  });
  const tierLabel = caps.vip ? 'VIP' : 'STANDARD';
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
  const activeVendors = caps.vip ? (
    <ActiveVendorsBar wedding={wedding} nowClock={clock?.nowClock} />
  ) : null;

  const mainSongRows = Array.isArray(musicPolicy?.mainSongs) ? musicPolicy.mainSongs : [];
  const mustPlayRows = Array.isArray(musicPolicy?.mustPlay) ? musicPolicy.mustPlay : [];
  const doNotPlayRows = Array.isArray(musicPolicy?.doNotPlay) ? musicPolicy.doNotPlay : [];
  const mainSongsTitle = t('music.mainSongs.title', { count: mainSongRows.length });
  const mustPlayTitle = t('music.mustPlay.title', { count: mustPlayRows.length });
  const doNotPlayTitle = t('music.doNotPlay.title', { count: doNotPlayRows.length });

  const historyFooter = caps.musicPolicy && (mainSongRows.length > 0 || mustPlayRows.length > 0) ? (
    <DjPolicyPanel label={t('music.title')}>
      {mainSongRows.length > 0 ? (
        <section aria-label={mainSongsTitle}>
          <h2 className="font-heading text-[10px] font-semibold uppercase tracking-widest text-brand-tint">
            ⭐ {mainSongsTitle}
          </h2>
          <div className="mt-1.5">
            <MainSongPills items={mainSongRows} t={t} />
          </div>
        </section>
      ) : null}
      {mustPlayRows.length > 0 ? (
        <section aria-label={mustPlayTitle} className={mainSongRows.length > 0 ? 'mt-3' : ''}>
          <h2 className="font-heading text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
            ✅ {mustPlayTitle}
          </h2>
          <div className="mt-1.5">
            <MustPlayPills items={mustPlayRows} t={t} />
          </div>
        </section>
      ) : null}
      {doNotPlayRows.length > 0 ? (
        <section
          aria-label={doNotPlayTitle}
          className={mainSongRows.length > 0 || mustPlayRows.length > 0 ? 'mt-3' : ''}
        >
          <h2 className="font-heading text-[10px] font-semibold uppercase tracking-widest text-alert-soft">
            🚫 {doNotPlayTitle}
          </h2>
          <div className="mt-1.5">
            <DoNotPlayPills items={doNotPlayRows} />
          </div>
        </section>
      ) : null}
    </DjPolicyPanel>
  ) : null;

  const futureFooter = caps.vip ? (
    <div className="space-y-2">
      <MusicianPreferredMusic
        suggestions={musicianSuggestions.suggestions}
        musicians={wedding?.musicians?.items ?? []}
        mainSongs={mainSongRows}
        timeline={timeline}
        loading={musicianSuggestions.loading}
        error={musicianSuggestions.error}
        onMarkPlayed={musicianSuggestions.markPlayed}
      />
      {caps.musicPolicy && musicPolicy?.hasData ? (
        <DjPolicyPanel label={t('music.title')}>
          <MusicPolicyCard policy={musicPolicy} panel showLists={false} />
        </DjPolicyPanel>
      ) : null}
    </div>
  ) : caps.musicPolicy && doNotPlayRows.length > 0 ? (
    <DjPolicyPanel label={t('music.title')}>
      <section aria-label={doNotPlayTitle}>
        <h2 className="font-heading text-[10px] font-semibold uppercase tracking-widest text-alert-soft">
          🚫 {doNotPlayTitle}
        </h2>
        <div className="mt-1.5">
          <DoNotPlayPills items={doNotPlayRows} />
        </div>
      </section>
    </DjPolicyPanel>
  ) : null;

  const currentColumnFooter = caps.musicPolicy ? (
    <div className="space-y-2">
      {activeVendors}
      <DjSetNotesNotepad
        policy={musicPolicy}
        showPolicy={!caps.vip}
        venueWarnings={venueGuard.warnings}
      />
    </div>
  ) : activeVendors;

  // Extra current-card detail for the shared focus stack. The stack owns the
  // card hierarchy and visibility counts; this body only adds DJ-specific
  // projected timing and booth cues.
  const djCurrentBody = (
    <div className="flex flex-col gap-2">
      {caps.vip && isDjSet && nextEntry ? (
        <DjSetCountdown wedding={wedding} clock={clock} nextEntry={nextEntry} />
      ) : null}
      <VenuePolicyWarnings warnings={venueGuard.warnings} effectsOnly />
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
      {activeEntry?.step.dj?.cutoff ? (
        <div className="w-fit rounded border border-alert/60 bg-alert/20 px-1.5 py-0.5 text-[10px] font-bold text-alert-soft">
          {t('dj.cutoff')} {activeEntry.step.dj.cutoff}
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
      {caps.vip && isDjSet ? (
        <MusicalSetBar
          key={activeEntry?.step?.id ?? 'musical-set'}
          wedding={wedding}
          clock={clock}
          activeEntry={activeEntry}
          onExtend={onExtendMusicalSet}
          extensionAllowed={extensionAllowed}
          extensionUntil={extensionUntil}
          closureTime={closureTime}
          extensionBlockedReason={extensionBlockedReason}
        />
      ) : null}
      {caps.guestRequests ? (
        <DjSongRequestQueue
          enabled={caps.guestRequests}
          variant="bar"
          role={role}
          accessToken={songRequestAccessToken}
          roomCode={songRequestRoomCode}
          discoPoloPolicy={musicPolicy?.discoPoloPolicy ?? 'NO'}
          showDiscoPoloBadge={false}
        />
      ) : null}


      <TimelineFocusStack
        compact
        zoneScroll={false}
        entries={timeline}
        activeIndex={activeIndex}
        currentBody={djCurrentBody}
        currentFooter={activeVendors}
        flash={flash}
        entryBodies={caps.vip ? ceremonySubStepBodies(timeline) : null}
      />

      {!caps.vip ? <EndHoursCard wedding={wedding} /> : null}

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
            <TopBarLogo />
            <TopBarClock clock={clock} />
            <TopBarRoleIdentity role={role} tier={tierLabel} wedding={wedding} />
          </>
        )}
        center={<TopBarCenterIdentity wedding={wedding} showCoupleLanguages={caps.coupleLanguages} />}
        right={(
          <>
            {viewSwitch}
            <ChildrenExpectedBadge wedding={wedding} inline />
          </>
        )}
        brand={<VipDjLogo wedding={wedding} vip={caps.vip} />}
      />

      {scheduleBanner}

      <SecondaryControlBar
        left={(
          <>
            <SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} outbox={outbox} />
            {caps.vipAuth && authControl ? authControl : null}
          </>
        )}
        center={
          (caps.culturalChips && culturalRules) || caps.speeches ? (
            <CulturalRulesBar
              rules={culturalRules ?? {}}
              oczepinyStatus={oczepinyStatus}
              showRules={Boolean(caps.culturalChips && culturalRules)}
              grid
              dense
            >
              {caps.speeches ? (
                <SpeechSummaryChip mode={speechMode} speeches={speeches} dense />
              ) : null}
            </CulturalRulesBar>
          ) : null
        }
        right={(
          <>
            <UtilityControlGroup>
              <LanguageToggle variant="desktop" />
              <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="desktop" />
            </UtilityControlGroup>
            <OpenOnPhoneButton role={role} tier={tierLabel} roomCode={roomCode} />
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
          showDiscoPoloBadge={false}
        />
      ) : null}
      </div>

      {caps.vip && isDjSet ? (
        <MusicalSetBar
          key={activeEntry?.step?.id ?? 'musical-set'}
          wedding={wedding}
          clock={clock}
          activeEntry={activeEntry}
          onExtend={onExtendMusicalSet}
          extensionAllowed={extensionAllowed}
          extensionUntil={extensionUntil}
          closureTime={closureTime}
          extensionBlockedReason={extensionBlockedReason}
        />
      ) : null}

      <main id="main-content" tabIndex={-1} className="flex-1 p-4">
        <div className="w-full space-y-4">
          <TimelineFocusStack
            zoneScroll={false}
            entries={timeline}
            activeIndex={activeIndex}
            currentBody={djCurrentBody}
            historyFooter={historyFooter}
            currentFooter={currentColumnFooter}
            futureFooter={futureFooter}
            flash={flash}
            entryBodies={caps.vip ? ceremonySubStepBodies(timeline) : null}
          />

          {!caps.vip ? <EndHoursCard wedding={wedding} /> : null}

          {!caps.musicPolicy ? (
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
          ) : null}
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
      authControl={caps.vipAuth ? authControl : null}
      banner={scheduleBanner}
    >
      {compactContent}
    </RoleShell>
  );
}
