import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import AppErrorBoundary from './components/AppErrorBoundary';
import DevViewSwitcher from './components/DevViewSwitcher';
import ViewSwitchControl from './components/ViewSwitchControl';
import RoleSignOutControl from './components/RoleSignOutControl';
import DjBoothView from './components/DjBoothView';
import PhotographerView from './components/PhotographerView';
import VenueManagerView from './components/VenueManagerView';
import CeremonyCueCard from './components/CeremonyCueCard';
import MandatoryUpdatePopup from './components/MandatoryUpdatePopup';
import WeddingClosureBanner from './components/WeddingClosureBanner';
import SpeakerView from './components/SpeakerView';
import McMasterView from './views/McMasterView';
import { buildInitialLiveState } from '@demo';
import { STEP_TYPE_STYLES } from './lib/styleConstants';
import { deriveHardAnchors } from './lib/hardAnchors';
import { resolveMandatoryConstraints } from './lib/mandatorySteps';
import { useLiveStageState } from './hooks/useLiveStageState';
import { useEventClock } from './hooks/useEventClock';
import { availableRoleIds, isMediaRole } from './lib/roles';
import { djDetailTier } from './lib/importantSongs';
import {
  resolveAllowedViewRoles,
  resolveBaseRole,
  resolveViewRole,
} from './lib/viewRoles';

// Development-only guest preview; the production build replaces the gate with
// false and drops the chunk.
const DevSongRequestPreview = import.meta.env.DEV
  ? lazy(() => import('./components/SongRequestApp'))
  : null;
import { buildDriftReport } from './lib/driftEngine';
import { resolveCakeProtocol } from './lib/cake';
import { resolveOczepinyIndicator } from './lib/oczepinyIndicator';
import { filterEnabledSteps } from './lib/predefinedSteps';
import { resolveMusicPolicy } from './lib/musicPolicy';
import { buildGameClicker } from './lib/games.js';import {
  resolveActiveSpeech,
  resolveSpeechMode,
  resolveSpeeches,
} from './lib/speeches';
import { loadSpeakerScript } from './lib/speakerCache';
import { swapBlockReason, swapNeedsWarning } from './lib/stepGuards';
import { resolveEventDateISO, resolveVenueTimeZone } from './lib/eventTime';
import { clearReloadState, loadReloadState } from './lib/reloadState';
import { resolvePwaReloadBlock } from './lib/pwaUpdate';
import { setPwaReloadContext } from './lib/pwaUpdateState';
import { activeSteps } from './lib/liveStageState';
import { isDevPreviewRequested } from './lib/devPreview';
import { applyTimeAwareStart } from './lib/timeTimeline';
import { deriveLastKnownStep, saveLastKnownStep } from './lib/lastKnownStep';
import { resolveEffectiveSyncStatus } from './lib/cartridgeSync';
import { useI18n } from './i18n/useI18n';

// Renders the stage deck once a cartridge is available. Production users only
// reach this component after the role token has fetched the server-published
// cartridge (or a cached copy of that same wedding); nothing here can import,
// activate, replace or reset a cartridge.
export default function StageDeck({
  wedding,
  roleSession,
  sessionValid,
  pairing,
  role,
  setRole,
  theme,
  toggleTheme,
  cartridgeStale = false,
  cartridgeRevision = null,
  cartridgeFreshness = 'current',
  cartridgeChecking = false,
  cartridgeNotice = null,
  isProduction = false,
  deckIntent = { roomCode: null, role: null },
  onSignOut,
}) {
  const { t } = useI18n();
  const WEDDING = useMemo(
    () => ({ ...wedding, steps: filterEnabledSteps(wedding) }),
    [wedding],
  );

  // Venue date/timezone drive ISO migration, clock display and day rollover.
  const EVENT_DATE_ISO = resolveEventDateISO(WEDDING);
  const VENUE_TIME_ZONE = resolveVenueTimeZone(WEDDING);
  const speeches = useMemo(() => resolveSpeeches(WEDDING), [WEDDING]);

  // The actor role is logged in mutation entries; production uses the token role.
  const actorRole = isProduction ? roleSession?.role ?? 'mc' : role;
  // Temporary dev inspector: `?dev=1` keeps the whole session in memory and
  // disables cloud sync plus live-state persistence. Production builds strip it.
  const DEV_PREVIEW =
    import.meta.env.DEV &&
    isDevPreviewRequested(
      typeof window === 'undefined' ? '' : window.location.search,
    );
  const {
    liveState,
    markCurrentDone,
    undoLastStep,
    canUndo,
    lastUndo,
    toggleSubtask,
    sendStagePing,
    swapWithNext,
    devJumpToStep,
    setGameResults,
    setMediaOverride,
    savedLocally,
    syncStatus,
    syncError,
    outbox,
    remoteUpdatedAt,
    liveCaughtUp,
    cartridgeNotices,
    serverTimeOffsetMs,
    serverTimeAvailable,
  } = useLiveStageState({
    steps: WEDDING.steps,
    weddingId: WEDDING.weddingId,
    // D7: the room is keyed by the weddingId, never the DDMM PIN.
    roomId: isProduction ? roleSession?.weddingId ?? null : WEDDING.weddingId,
    initialLiveState: buildInitialLiveState(WEDDING),
    eventDateISO: EVENT_DATE_ISO,
    timeZone: VENUE_TIME_ZONE,
    accessToken: sessionValid ? roleSession.token : null,
    requireToken: isProduction,
    role: actorRole,
    cartridgeRevision,
    speeches,
    preview: DEV_PREVIEW,
  });
  // One shared ticking clock for every view (P0.6). Recomputing the drift
  // report from `now` keeps overruns, anchors and cutoffs live.
  const now = useEventClock({ serverTimeOffsetMs });
  // TODO 24: derive a tiny human-readable snapshot for the error boundaries,
  // then persist it. The snapshot is derived during render (no extra state) and
  // the effect only writes to localStorage.
  const lastKnownStep = deriveLastKnownStep({
    weddingId: WEDDING.weddingId,
    steps: WEDDING.steps,
    activeStepId: liveState.active_step_id,
    completedStepIds: liveState.completed_step_ids,
    role: actorRole,
  });
  useEffect(() => {
    saveLastKnownStep({
      weddingId: lastKnownStep.weddingId,
      step: lastKnownStep.stepId
        ? {
            id: lastKnownStep.stepId,
            title: lastKnownStep.title,
            type: lastKnownStep.type,
            location: lastKnownStep.location,
            time: lastKnownStep.plannedTime,
          }
        : null,
      role: lastKnownStep.role,
      completedCount: lastKnownStep.completedCount,
      totalSteps: lastKnownStep.totalSteps,
    });
  }, [
    lastKnownStep.weddingId,
    lastKnownStep.stepId,
    lastKnownStep.title,
    lastKnownStep.type,
    lastKnownStep.location,
    lastKnownStep.plannedTime,
    lastKnownStep.role,
    lastKnownStep.completedCount,
    lastKnownStep.totalSteps,
  ]);
  const [overlay, setOverlay] = useState(() => loadReloadState()?.overlay ?? null);
  // Local, device-only view override. It never changes the authenticated role.
  const [viewRoleOverride, setViewRoleOverride] = useState(null);
  const [controlNotice, setControlNotice] = useState('');
  const [undoToast, setUndoToast] = useState(null);
  const [frozenLateDrift, setFrozenLateDrift] = useState(null);
  const lateFreezeTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (lateFreezeTimerRef.current) clearTimeout(lateFreezeTimerRef.current);
    },
    [],
  );
  // Offline cache for the speaker script (the active id is synced separately).
  const [cachedSpeakerSpeech] = useState(() => loadSpeakerScript(WEDDING.weddingId));
  const closeOverlay = () => setOverlay(null);
  const handleRoleChange = (next) => {
    setOverlay(null);
    setRole(next);
    window.setTimeout(() => document.getElementById('main-content')?.focus(), 50);
  };

  // Issue #81: restore the overlay/scroll saved before an accepted PWA reload.
  useEffect(() => {
    const state = loadReloadState();
    if (!state) return undefined;
    clearReloadState();
    if (state.scrollY > 0) {
      const frame = window.requestAnimationFrame(() => window.scrollTo(0, state.scrollY));
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, []);

  // Issue #81: tell the global update prompt when a reload is unsafe.
  useEffect(() => {
    setPwaReloadContext({
      overlay,
      blockedReason: resolvePwaReloadBlock({
        overlay,
        activeSpeech: Boolean(liveState.active_speech_id),
        activeStepId: liveState.active_step_id ?? null,
      }),
    });
  }, [overlay, liveState.active_speech_id, liveState.active_step_id]);

  useEffect(
    () => () => setPwaReloadContext({ overlay: null, blockedReason: null }),
    [],
  );

  const handleUnpair = () => {
    if (!isProduction) return;
    const confirmed = window.confirm(t('mc.confirm.signOut'));
    if (!confirmed) return;
    onSignOut?.();
  };

  const availableRoles = availableRoleIds(WEDDING.hostingMode);
  // Production: the role token fixes this device to exactly one role. The MC
  // may render the read-only DJ view locally, but keeps its MC identity/token.
  const roleIds = isProduction ? [roleSession?.role ?? 'mc'] : availableRoles;
  const baseRole = resolveBaseRole({
    isProduction,
    roleSessionRole: roleSession?.role,
    role,
    availableRoles,
  });
  const allowedViewRoles = resolveAllowedViewRoles({
    isProduction,
    baseRole,
    availableRoles,
    development: Boolean(import.meta.env.DEV),
  });
  const currentRole = resolveViewRole({
    override: viewRoleOverride,
    allowedRoles: allowedViewRoles,
    baseRole,
  });
  const devDjPreviewId =
    import.meta.env.DEV && ['dj_mark', 'dj_szymoniak'].includes(currentRole)
      ? currentRole
      : null;
  const djViewWedding = devDjPreviewId
    ? {
        ...WEDDING,
        djIdentityId: devDjPreviewId,
        servicePackage: 'HOST_AND_DJ_VIP',
      }
    : WEDDING;
  const productionDjViewAllowed =
    isProduction && allowedViewRoles.includes('mc') && allowedViewRoles.includes('dj');
  const showDjCues = availableRoles.includes("dj");

  const handleViewChange = (next) => {
    setOverlay(null);
    setViewRoleOverride(next === baseRole ? null : next);
    window.setTimeout(() => document.getElementById('main-content')?.focus(), 50);
  };

  const handleDevStepChange = (nextStepId) => {
    if (!DEV_PREVIEW || !nextStepId) return;
    setOverlay(null);
    devJumpToStep(nextStepId);
    window.setTimeout(() => document.getElementById('main-content')?.focus(), 50);
  };

  const djTierLabel = djDetailTier(WEDDING) === 'vip' ? 'VIP' : 'STANDARD';
  const viewSwitch = productionDjViewAllowed ? (
    <ViewSwitchControl
      mode={currentRole === 'dj' ? 'return' : 'enter'}
      tier={djTierLabel}
      onClick={() => handleViewChange(currentRole === 'dj' ? 'mc' : 'dj')}
    />
  ) : null;

  // Build-time gate: Vite replaces this with `false` in production and the
  // temporary switcher module is tree-shaken out of the production bundle.
  const DEV_VIEW_SWITCHER = import.meta.env.DEV;

  const overriddenSteps = liveState.media_overrides?.steps?.value;
  const steps = activeSteps(
    Array.isArray(overriddenSteps) ? overriddenSteps : WEDDING.steps,
    liveState,
  );

  const devViewSwitcher = DEV_VIEW_SWITCHER ? (
    <DevViewSwitcher
      currentRole={currentRole}
      onChange={handleViewChange}
      previewEnabled={DEV_PREVIEW}
      steps={steps}
      currentStepId={liveState.active_step_id}
      onStepChange={handleDevStepChange}
    />
  ) : null;
  const mandatorySettings = resolveMandatoryConstraints({ ...WEDDING, steps });
  const hardAnchors = deriveHardAnchors(steps);
  const driftReport = buildDriftReport(steps, liveState, {
    hardAnchors,
    now,
    eventDateISO: EVENT_DATE_ISO,
    timeZone: VENUE_TIME_ZONE,
    serverTimeOffsetMs,
    serverTimeAvailable,
  });
  const displayedDriftReport = frozenLateDrift
    ? { ...driftReport, drift: frozenLateDrift }
    : driftReport;
  const timeline = applyTimeAwareStart(driftReport.entries, {
    now,
    eventDateISO: EVENT_DATE_ISO,
    timeZone: VENUE_TIME_ZONE,
  });
  const activeIndex = timeline.findIndex((entry) => entry.isActive);
  const currentEntry = activeIndex >= 0 ? timeline[activeIndex] : null;
  const nextEntry =
    activeIndex >= 0 ? timeline[activeIndex + 1] ?? null : timeline.find((entry) => !entry.isDone) ?? null;
  const djOczepinyStatus = resolveOczepinyIndicator({
    wedding: { ...WEDDING, hardAnchors },
    now: driftReport.clock?.now ?? null,
    eventDateISO: EVENT_DATE_ISO,
    timeZone: VENUE_TIME_ZONE,
  });
  const authControl = (
    <RoleSignOutControl
      isProduction={isProduction}
      role={baseRole}
      pin={pairing?.pin ?? null}
      onSignOut={handleUnpair}
    />
  );
  const cakeProtocol = resolveCakeProtocol(WEDDING, timeline, activeIndex);
  const musicPolicy = resolveMusicPolicy(WEDDING, now, {
    eventDateISO: EVENT_DATE_ISO,
    timeZone: VENUE_TIME_ZONE,
    timeline,
  });
  const speechMode = resolveSpeechMode(WEDDING, speeches);
  const cakeServiceMode = mandatorySettings.cakeServiceMode ?? 'KITCHEN_RETURN';
  const activeSpeech = resolveActiveSpeech(speeches, liveState.active_speech_id);
  // The visible sync badge is only fully green after BOTH the cartridge and
  // the live-state catch-up have finished (issue #167).
  const online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  const displaySyncStatus = isProduction
    ? resolveEffectiveSyncStatus({
        syncStatus,
        liveCaughtUp,
        cartridgeFreshness: cartridgeChecking ? 'connecting' : cartridgeFreshness,
        online,
      })
    : syncStatus;
  // If the cartridge is unavailable but the active speech id is still known,
  // show the cached copy on this speaker device instead of a blank screen.
  const speakerSpeech =
    activeSpeech ??
    (cachedSpeakerSpeech && cachedSpeakerSpeech.id === liveState.active_speech_id
      ? cachedSpeakerSpeech
      : null);
  const currentStep = currentEntry?.step ?? null;
  const completedCount = driftReport.completedCount;
  const isComplete = !currentStep;
  const stepTypeClass = currentStep ? STEP_TYPE_STYLES[currentStep.type] ?? STEP_TYPE_STYLES.FLEXIBLE : '';
  const script = currentStep?.teleprompter?.type === "SPEECH" ? currentStep.teleprompter : null;
  const game = currentStep?.game?.id
    ? buildGameClicker(WEDDING, currentStep.game.id)
    : currentStep?.teleprompter?.type === "GAME_QUESTIONS"
      ? currentStep.teleprompter
      : null;
  const stepSubtasks = currentStep?.subTasks ?? [];

  // P0.7: block hard anchors, warn on photographer cues.
  const swapBlock = swapBlockReason(currentStep, nextEntry?.step ?? null);
  const swapWarn = swapNeedsWarning(currentStep, nextEntry?.step ?? null);
  const notifyUndo = (label) => setUndoToast({ id: Date.now(), label });

  const releaseLateFreeze = () => {
    if (lateFreezeTimerRef.current) {
      clearTimeout(lateFreezeTimerRef.current);
      lateFreezeTimerRef.current = null;
    }
    setFrozenLateDrift(null);
  };

  const handleSwap = () => {
    if (!currentStep || !nextEntry || swapBlock) return;
    if (swapWarn && !window.confirm(t('mc.confirm.swapCue'))) {
      return;
    }
    releaseLateFreeze();
    setControlNotice(
      t('mc.notice.swapped', {
        current: currentStep.title,
        next: nextEntry.step.title,
      }),
    );
    swapWithNext();
    notifyUndo(t('mc.undo.swappedSteps'));
  };
  const handleAdvance = () => {
    releaseLateFreeze();
    markCurrentDone();
    setControlNotice(t('mc.notice.stepDone'));
    notifyUndo(t('mc.undo.stepCompleted'));
  };
  const handleUndo = () => {
    if (!canUndo) return;
    // Keep the cumulative LATE display stable across the undo transition.
    setFrozenLateDrift(driftReport.drift);
    if (lateFreezeTimerRef.current) clearTimeout(lateFreezeTimerRef.current);
    lateFreezeTimerRef.current = setTimeout(() => {
      lateFreezeTimerRef.current = null;
      setFrozenLateDrift(null);
    }, 5000);
    undoLastStep();
    setUndoToast(null);
    setControlNotice(t('mc.notice.undone'));
  };
  const roleProps = {
    role: currentRole,
    roles: roleIds,
    pin: pairing?.pin ?? null,
    onRoleChange: handleRoleChange
  };

  const cartridgeMessages = [];
  if (cartridgeNotice?.kind === 'updated') {
    cartridgeMessages.push(
      t('app.cartridgeUpdated', { revision: cartridgeNotice.revision ?? '' }),
    );
  }
  for (const notice of cartridgeNotices) {
    if (notice.kind === 'step_removed') cartridgeMessages.push(t('app.cartridgeStepRemoved'));
    if (notice.kind === 'speech_removed') cartridgeMessages.push(t('app.cartridgeSpeechRemoved'));
  }

  const cartridgeNoticeBanner =
    cartridgeMessages.length > 0 ? (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-16 left-1/2 z-banner w-[min(92vw,34rem)] -translate-x-1/2 rounded-lg border border-sky-700 bg-sky-950/95 px-3 py-2 text-center font-mono text-[11px] leading-snug text-sky-100 shadow-2xl"
      >
        {cartridgeMessages.join(' ')}
      </div>
    ) : null;

  const staleBanner = cartridgeStale ? (
    <div
      role="status"
      className="fixed bottom-3 left-1/2 z-banner -translate-x-1/2 rounded-lg border border-amber-700 bg-amber-950/95 px-3 py-2 text-center font-mono text-[11px] leading-snug text-amber-100 shadow-2xl"
    >
      {t('app.offlineCartridge')}
    </div>
  ) : null;

  const statusBanners = (
    <>
      {cartridgeNoticeBanner}
      {staleBanner}
      <MandatoryUpdatePopup
        weddingId={WEDDING.weddingId}
        role={currentRole}
        isVipDj={djDetailTier(WEDDING) === 'vip'}
        update={liveState.media_overrides?.steps ?? null}
      />
      <CeremonyCueCard wedding={WEDDING} role={currentRole} />
      <WeddingClosureBanner
        role={currentRole}
        isVipDj={djDetailTier(WEDDING) === 'vip'}
        closureTime={mandatorySettings.closureTime}
        extensionAllowed={mandatorySettings.closureExtensionAllowed === true}
        extensionUntil={mandatorySettings.closureExtensionUntil ?? null}
        lastSong={mandatorySettings.lastSong}
      />
    </>
  );

  if (import.meta.env.DEV && currentRole === 'song_request') {
    return (
      <>
        <AppErrorBoundary
          scope="song_request"
          weddingId={WEDDING.weddingId}
          role={currentRole}
          resetKey={currentRole}
        >
          <Suspense fallback={null}>
            <DevSongRequestPreview
              roomCode={deckIntent.roomCode ?? 'DEV000'}
              preview
            />
          </Suspense>
        </AppErrorBoundary>
        {devViewSwitcher}
      </>
    );
  }

  if (currentRole === "dj" || currentRole === "dj_standard" || devDjPreviewId) {
    return (
      <>
        <AppErrorBoundary
          scope="dj"
          weddingId={WEDDING.weddingId}
          role={currentRole}
          resetKey={currentRole}
          lastKnownStep={lastKnownStep}
        >
          <DjBoothView
            wedding={djViewWedding}
            timeline={timeline}
            projectedFinish={driftReport.projectedFinish}
            clock={driftReport.clock}
            musicPolicy={musicPolicy}
            syncStatus={displaySyncStatus}
            syncError={syncError}
            remoteUpdatedAt={remoteUpdatedAt}
            outbox={outbox}
            servicePackage={
              currentRole === 'dj_standard' ? 'HOST_AND_DJ_STANDARD' : djViewWedding.servicePackage
            }
            role="dj"
            theme={theme}
            onToggleTheme={toggleTheme}
            songRequestAccessToken={sessionValid ? roleSession?.token ?? null : null}
            songRequestRoomCode={deckIntent.roomCode}
            roomCode={deckIntent.roomCode}
            viewSwitch={viewSwitch}
            culturalRules={WEDDING.culturalRules}
            oczepinyStatus={djOczepinyStatus}
            speeches={speeches}
            speechMode={speechMode}
            authControl={authControl}
            {...roleProps}
          />
        </AppErrorBoundary>
        {statusBanners}
        {devViewSwitcher}
      </>
    );
  }

  if (isMediaRole(currentRole)) {
    return (
      <>
        <AppErrorBoundary
          scope="photo"
          weddingId={WEDDING.weddingId}
          role={currentRole}
          resetKey={currentRole}
          lastKnownStep={lastKnownStep}
        >
          <PhotographerView
            wedding={WEDDING}
            timeline={timeline}
            clock={driftReport.clock}
            syncStatus={displaySyncStatus}
            syncError={syncError}
            remoteUpdatedAt={remoteUpdatedAt}
            outbox={outbox}
            theme={theme}
            onToggleTheme={toggleTheme}
            roomCode={deckIntent.roomCode}
            culturalRules={WEDDING.culturalRules}
            oczepinyStatus={djOczepinyStatus}
            speeches={speeches}
            speechMode={speechMode}
            authControl={authControl}
            mediaOverrides={liveState.media_overrides}
            onMiniSessionOverride={(time) => setMediaOverride('miniSessionTime', time)}
            checkedSubtasks={liveState.checked_subtasks}
            onToggleSubtask={toggleSubtask}
            cakeProtocol={cakeProtocol}
            cakeServiceMode={cakeServiceMode}
            {...roleProps}
          />
        </AppErrorBoundary>
        {statusBanners}
        {devViewSwitcher}
      </>
    );
  }

  if (currentRole === "venue_manager") {
    return (
      <>
        <AppErrorBoundary
          scope="venue_manager"
          weddingId={WEDDING.weddingId}
          role={currentRole}
          resetKey={currentRole}
          lastKnownStep={lastKnownStep}
        >
          <VenueManagerView
            wedding={WEDDING}
            timeline={timeline}
            clock={driftReport.clock}
            syncStatus={displaySyncStatus}
            syncError={syncError}
            remoteUpdatedAt={remoteUpdatedAt}
            outbox={outbox}
            theme={theme}
            onToggleTheme={toggleTheme}
            mandatoryOverride={liveState.media_overrides?.steps ?? null}
            onUpdateMandatory={(nextSteps) => setMediaOverride('steps', nextSteps)}
          />
        </AppErrorBoundary>
        {statusBanners}
        {devViewSwitcher}
      </>
    );
  }

  if (currentRole === "speaker") {
    return (
      <>
        <AppErrorBoundary
          scope="speaker"
          weddingId={WEDDING.weddingId}
          role={currentRole}
          resetKey={currentRole}
          lastKnownStep={lastKnownStep}
        >
          <SpeakerView
            wedding={WEDDING}
            clock={driftReport.clock}
            speechMode={speechMode}
            speechCount={speeches.length}
            accessToken={sessionValid ? roleSession?.token ?? null : null}
            activeSpeech={speakerSpeech}
            activeSpeechId={liveState.active_speech_id}
            fromCache={!activeSpeech && Boolean(speakerSpeech)}
            syncStatus={displaySyncStatus}
            syncError={syncError}
            remoteUpdatedAt={remoteUpdatedAt}
            outbox={outbox}
            theme={theme}
            onToggleTheme={toggleTheme}
            roomCode={deckIntent.roomCode}
          />
        </AppErrorBoundary>
        {statusBanners}
        {devViewSwitcher}
      </>
    );
  }

  const mcModel = {
    WEDDING,
    childrenExpected: WEDDING.childrenExpected === true,
    driftReport: displayedDriftReport,
    handleUnpair,
    IS_PRODUCTION: isProduction,
    roleSession,
    pairing,
    roleIds,
    currentRole,
    handleRoleChange,
    viewSwitch: currentRole === 'mc' ? viewSwitch : null,
    roomCode: deckIntent.roomCode,
    theme,
    toggleTheme,
    syncStatus: displaySyncStatus,
    syncError,
    outbox,
    remoteUpdatedAt,
    currentStep,
    stepTypeClass,
    showDjCues,
    stepSubtasks,
    liveState,
    toggleSubtask,
    script,
    game,
    setOverlay,
    steps,
    completedCount,
    nextEntry,
    cakeProtocol,
    cakeServiceMode,
    musicPolicy,
    speechMode,
    speeches,
    setGameResults,
    sendStagePing,
    isComplete,
    handleSwap,
    swapBlock,
    controlNotice,
    savedLocally,
    handleUndo,
    canUndo,
    lastUndo,
    handleAdvance,
    overlay,
    closeOverlay,
    undoToast,
    setUndoToast,
  };

  return (
    <>
      <AppErrorBoundary
        scope="mc"
        weddingId={WEDDING.weddingId}
        role={currentRole}
        resetKey={currentRole}
        lastKnownStep={lastKnownStep}
      >
        <McMasterView model={mcModel} />
      </AppErrorBoundary>
      {statusBanners}
      {devViewSwitcher}
    </>
  );
}
