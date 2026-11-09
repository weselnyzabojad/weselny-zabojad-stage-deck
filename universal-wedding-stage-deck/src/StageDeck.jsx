import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { buildInitialLiveState } from './demo/demoWedding';
import { STEP_TYPE_STYLES } from './lib/styleConstants';
import { useLiveStageState } from './hooks/useLiveStageState';
import { useEventClock } from './hooks/useEventClock';
import { availableRoleIds, isMediaRole } from './lib/roles';
import { djDetailTier } from './lib/importantSongs';
import {
  resolveAllowedViewRoles,
  resolveBaseRole,
  resolveViewRole,
} from './lib/viewRoles';
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
  const {
    liveState,
    markCurrentDone,
    undoLastStep,
    canUndo,
    lastUndo,
    toggleSubtask,
    sendStagePing,
    swapWithNext,
    selectSpeech,
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
    if (isProduction) {
      const confirmed = window.confirm(
        'Sign out of this role? You will need the role PIN to rejoin.'
      );
      if (!confirmed) return;
      onSignOut?.();
      return;
    }
    const confirmed = window.confirm(
      "Forget the room PIN on this device? Timeline progress stays saved locally."
    );
    if (confirmed) pairing.unpair();
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
  const productionDjViewAllowed =
    isProduction && allowedViewRoles.includes('mc') && allowedViewRoles.includes('dj');
  const showDjCues = availableRoles.includes("dj");

  const handleViewChange = (next) => {
    setOverlay(null);
    setViewRoleOverride(next === baseRole ? null : next);
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
  const devViewSwitcher = DEV_VIEW_SWITCHER ? (
    <DevViewSwitcher currentRole={currentRole} onChange={handleViewChange} />
  ) : null;

  const steps = activeSteps(WEDDING.steps, liveState);
  const driftReport = buildDriftReport(steps, liveState, {
    hardAnchors: WEDDING.hardAnchors,
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
    wedding: WEDDING,
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
  const mandatorySettings =
    liveState.media_overrides?.mandatorySteps?.value ?? WEDDING.mandatorySteps ?? {};
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
  const realStart = currentEntry?.projectedStart ?? null;
  const estimatedEnd = currentEntry?.projectedEnd ?? null;
  const stepTypeClass = currentStep ? STEP_TYPE_STYLES[currentStep.type] ?? STEP_TYPE_STYLES.FLEXIBLE : '';
  const script = currentStep?.teleprompter?.type === "SPEECH" ? currentStep.teleprompter : null;
  const game = currentStep?.gameId
    ? buildGameClicker(WEDDING, currentStep.gameId)
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
    if (
      swapWarn &&
      !window.confirm(
        'One of these steps carries a photographer cue. Swap anyway? The vendor may be waiting for that moment.',
      )
    ) {
      return;
    }
    releaseLateFreeze();
    setControlNotice(`Swapped ${currentStep.title} with ${nextEntry.step.title}.`);
    swapWithNext();
    notifyUndo('Swapped steps');
  };
  const handleAdvance = () => {
    releaseLateFreeze();
    markCurrentDone();
    setControlNotice('Step marked done.');
    notifyUndo('Step completed');
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
    setControlNotice('Last action undone.');
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
        update={liveState.media_overrides?.mandatorySteps ?? null}
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

  if (currentRole === "dj" || currentRole === "dj_standard") {
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
            wedding={WEDDING}
            timeline={timeline}
            projectedFinish={driftReport.projectedFinish}
            clock={driftReport.clock}
            musicPolicy={musicPolicy}
            syncStatus={displaySyncStatus}
            syncError={syncError}
            remoteUpdatedAt={remoteUpdatedAt}
            outbox={outbox}
            servicePackage={
              currentRole === 'dj_standard' ? 'HOST_AND_DJ_STANDARD' : WEDDING.servicePackage
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
            activeSpeechId={liveState.active_speech_id}
            authControl={authControl}
            mandatoryOverride={liveState.media_overrides?.mandatorySteps ?? null}
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
            activeSpeechId={liveState.active_speech_id}
            authControl={authControl}
            mediaOverrides={liveState.media_overrides}
            onMiniSessionOverride={(time) => setMediaOverride('miniSessionTime', time)}
            checkedSubtasks={liveState.checked_subtasks}
            onToggleSubtask={toggleSubtask}
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
            mandatoryOverride={liveState.media_overrides?.mandatorySteps ?? null}
            onUpdateMandatory={(settings) => setMediaOverride('mandatorySteps', settings)}
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
    realStart,
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
    estimatedEnd,
    showDjCues,
    stepSubtasks,
    liveState,
    toggleSubtask,
    script,
    game,
    setOverlay,
    currentEntry,
    steps,
    completedCount,
    nextEntry,
    cakeProtocol,
    cakeServiceMode,
    mandatoryOverride: liveState.media_overrides?.mandatorySteps ?? null,
    musicPolicy,
    speechMode,
    speeches,
    selectSpeech,
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
