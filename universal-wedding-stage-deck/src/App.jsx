import React, { useEffect, useState } from 'react';
import AppErrorBoundary from './components/AppErrorBoundary';
import CartridgeImporter from './components/CartridgeImporter';
import DjBoothView from './components/DjBoothView';
import PairingScreen from './components/PairingScreen';
import PhotographerView from './components/PhotographerView';
import PocketRemoteView from './components/PocketRemoteView';
import RoleJoinScreen from './components/RoleJoinScreen';
import SpeakerView from './components/SpeakerView';
import TeleprompterOverlay from './components/TeleprompterOverlay';
import UndoToast from './components/UndoToast';
import McMasterView from './views/McMasterView';
import { DEFAULT_WEDDING, buildInitialLiveState } from './demo/demoWedding';
import { STEP_TYPE_STYLES } from './lib/styleConstants';
import { useLiveStageState } from './hooks/useLiveStageState';
import { usePairing } from './hooks/usePairing';
import { useRole } from './hooks/useRole';
import { useEventClock } from './hooks/useEventClock';
import { useTheme } from './hooks/useTheme';
import { useSensitiveNotes } from './hooks/useSensitiveNotes';
import { availableRoleIds } from './lib/roles';
import { buildDriftReport } from './lib/driftEngine';
import { resolveCakeProtocol } from './lib/cake';
import { resolveContacts } from './lib/contacts';
import { resolveMusicPolicy } from './lib/musicPolicy';
import {
  resolveActiveSpeech,
  resolveSpeechMode,
  resolveSpeeches,
} from './lib/speeches';
import { clearSpeakerScript, loadSpeakerScript } from './lib/speakerCache';
import { swapBlockReason, swapNeedsWarning } from './lib/stepGuards';
import { resolveEventDateISO, resolveVenueTimeZone } from './lib/eventTime';
import { getSyncConfig } from './lib/sync/syncConfig';
import {
  clearRoleSession,
  isRoleSessionValid,
  loadRoleSession,
  parseDeckIntent,
  saveRoleSession,
} from './lib/sync/roleSession';
import { activeSteps, findDeferTarget } from './lib/liveStageState';
import { deriveLastKnownStep, saveLastKnownStep, clearLastKnownStep } from './lib/lastKnownStep';
import { loadActiveCartridge, saveActiveCartridge, clearActiveCartridge } from './lib/cartridgeStorage';
import { createSupabaseSyncClient } from './lib/sync/supabaseSyncClient';
import { clearStoredHostKey } from './lib/sensitiveNotes';

const STORED_CARTRIDGE = loadActiveCartridge();
const ACTIVE_WEDDING = STORED_CARTRIDGE ?? DEFAULT_WEDDING;
const HAS_STORED_CARTRIDGE = Boolean(STORED_CARTRIDGE);

// Venue date/timezone drive ISO migration, clock display and day rollover.
const EVENT_DATE_ISO = resolveEventDateISO(ACTIVE_WEDDING);
const VENUE_TIME_ZONE = resolveVenueTimeZone(ACTIVE_WEDDING);

// Production `/deck/` uses per-role PINs validated by the join_room Edge
// Function. Local/demo mode keeps the DDMM display-PIN gate.
const SYNC_CONFIG = getSyncConfig();
const IS_PRODUCTION = SYNC_CONFIG.isProduction;
const DECK_INTENT =
  typeof window !== 'undefined'
    ? parseDeckIntent(window.location.pathname, window.location.search, import.meta.env.BASE_URL)
    : { roomCode: null, role: null };

export default function App() {
  const WEDDING = ACTIVE_WEDDING;
  const [roleSession, setRoleSession] = useState(() =>
    IS_PRODUCTION ? loadRoleSession() : null,
  );
  const sessionValid = IS_PRODUCTION && isRoleSessionValid(roleSession);
  const pairing = usePairing({ expectedPin: WEDDING.syncPin, weddingId: WEDDING.weddingId });
  const { role, setRole } = useRole();
  // The actor role is logged in mutation entries; production uses the token role.
  const actorRole = IS_PRODUCTION ? roleSession?.role ?? 'mc' : role;
  const {
    liveState,
    markCurrentDone,
    undoLastStep,
    canUndo,
    lastUndo,
    toggleSubtask,
    sendStagePing,
    addManualOffset,
    clearManualOffset,
    swapWithNext,
    deferToJokerDrawer,
    restoreDeferredStep,
    selectSpeech,
    savedLocally,
    syncStatus,
    syncConfigured,
    syncError,
    remoteUpdatedAt,
    serverTimeOffsetMs,
    serverTimeAvailable,
  } = useLiveStageState({
    steps: WEDDING.steps,
    weddingId: WEDDING.weddingId,
    // D7: the room is keyed by the weddingId, never the DDMM PIN.
    roomId: IS_PRODUCTION ? roleSession?.weddingId ?? null : WEDDING.weddingId,
    initialLiveState: buildInitialLiveState(WEDDING),
    eventDateISO: EVENT_DATE_ISO,
    timeZone: VENUE_TIME_ZONE,
    accessToken: sessionValid ? roleSession.token : null,
    requireToken: IS_PRODUCTION,
    role: actorRole,
  });
  // Per-device theme (TODO 27): Night Stage default, Daylight for outdoor glare.
  const { theme, toggleTheme } = useTheme();
  // D4: the host/MC device decrypts sensitive notes with its local host key.
  const sensitiveNotes = useSensitiveNotes({
    enabled: IS_PRODUCTION && sessionValid && roleSession?.role === 'mc',
    wedding: WEDDING,
    weddingId: roleSession?.weddingId ?? WEDDING.weddingId,
    accessToken: sessionValid ? roleSession.token : null,
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
  const [overlay, setOverlay] = useState(null);
  const [controlNotice, setControlNotice] = useState('');
  const [undoToast, setUndoToast] = useState(null);
  const [importerOpen, setImporterOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  // Offline cache for the speaker script (the active id is synced separately).
  const [cachedSpeakerSpeech] = useState(() => loadSpeakerScript(ACTIVE_WEDDING.weddingId));
  const [cartridgeError, setCartridgeError] = useState(null);
  const closeOverlay = () => setOverlay(null);
  const handleRoleChange = (next) => {
    setOverlay(null);
    setRole(next);
  };

  // Production: after the role PIN is accepted, fetch the role-scoped cartridge
  // from the room. A cartridge cached for another wedding does not count.
  const hasMatchingCartridge =
    HAS_STORED_CARTRIDGE &&
    (!IS_PRODUCTION || ACTIVE_WEDDING.weddingId === roleSession?.weddingId);
  const needsProductionCartridge = IS_PRODUCTION && sessionValid && !hasMatchingCartridge;
  useEffect(() => {
    if (!needsProductionCartridge) return undefined;

    let cancelled = false;
    const client = createSupabaseSyncClient(SYNC_CONFIG, {
      accessToken: roleSession.token,
    });

    client
      .fetchWedding(roleSession.weddingId)
      .then((row) => {
        if (cancelled) return;
        if (!row?.cartridge) throw new Error('The server has no cartridge for this room.');
        if (!saveActiveCartridge(row.cartridge)) {
          throw new Error('The published cartridge is missing required fields.');
        }
        window.location.reload();
      })
      .catch((error) => {
        if (!cancelled) setCartridgeError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [needsProductionCartridge, roleSession]);

  if (IS_PRODUCTION && !sessionValid) {
    return (
      <AppErrorBoundary
        scope="join"
        weddingId={WEDDING.weddingId}
        lastKnownStep={lastKnownStep}
      >
        <RoleJoinScreen
          intent={DECK_INTENT}
          theme={theme}
          onToggleTheme={toggleTheme}
          onJoined={(session) => {
            saveRoleSession(session);
            setRoleSession(session);
          }}
        />
      </AppErrorBoundary>
    );
  }

  if (needsProductionCartridge) {
    return (
      <AppErrorBoundary
        scope="cartridge"
        weddingId={WEDDING.weddingId}
        lastKnownStep={lastKnownStep}
      >
        <div className="flex min-h-screen items-center justify-center bg-page px-4 text-center text-slate-100">
          <div className="max-w-sm rounded-2xl border border-line bg-card p-6 shadow-2xl">
            <div className="text-3xl" aria-hidden="true">
              {cartridgeError ? '⚠️' : '🎧'}
            </div>
            <h1 className="mt-2 font-heading text-lg font-bold text-white">
              {cartridgeError ? 'Could not load this wedding' : 'Loading wedding…'}
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {cartridgeError ??
                'Fetching the role-scoped cartridge for this room. No wedding data is cached until it arrives.'}
            </p>
            {cartridgeError ? (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg border border-brand-strong bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-hover"
              >
                Retry
              </button>
            ) : null}
          </div>
        </div>
      </AppErrorBoundary>
    );
  }

  if (!IS_PRODUCTION && !pairing.isPaired) {
    return (
      <AppErrorBoundary
        scope="pairing"
        weddingId={WEDDING.weddingId}
        lastKnownStep={lastKnownStep}
      >
        <PairingScreen
          wedding={WEDDING}
          onPair={pairing.pair}
          cloudConfigured={syncConfigured}
          theme={theme}
          onToggleTheme={toggleTheme}
          onImport={() => setImporterOpen(true)}
        />
        <CartridgeImporter
          key={importerOpen ? 'importer-open' : 'importer-closed'}
          open={importerOpen}
          onClose={() => setImporterOpen(false)}
          currentCartridge={WEDDING}
        />
      </AppErrorBoundary>
    );
  }

  const handleUnpair = () => {
    if (IS_PRODUCTION) {
      const confirmed = window.confirm(
        'Sign out of this role? You will need the role PIN to rejoin.'
      );
      if (!confirmed) return;
      clearRoleSession();
      setRoleSession(null);
      return;
    }
    const confirmed = window.confirm(
      "Forget the room PIN on this device? Timeline progress stays saved locally."
    );
    if (confirmed) pairing.unpair();
  };

  const availableRoles = availableRoleIds(WEDDING.hostingMode);
  // Production: the role token fixes this device to exactly one role. Switching
  // requires signing out and joining with another role's PIN.
  const roleIds = IS_PRODUCTION ? [roleSession.role] : availableRoles;
  const currentRole = IS_PRODUCTION
    ? roleSession.role
    : roleIds.includes(role)
      ? role
      : "mc";
  const showDjCues = availableRoles.includes("dj");

  const steps = activeSteps(WEDDING.steps, liveState);
  const manualOffset = liveState.manual_offset_minutes ?? 0;
  const vipAlerts =
    sensitiveNotes.payload?.vipAlerts ?? WEDDING.tact_and_vip_alerts ?? [];
  const jokerCount = WEDDING.jokersCount ?? WEDDING.jokerGames?.length ?? 0;
  const contacts = resolveContacts({
    ...WEDDING,
    contacts: sensitiveNotes.payload?.contacts ?? WEDDING.contacts,
  });
  const driftReport = buildDriftReport(steps, liveState, {
    jokerAvailable: jokerCount > 0,
    hardAnchors: WEDDING.hardAnchors,
    manualOffsetMinutes: manualOffset,
    now,
    eventDateISO: EVENT_DATE_ISO,
    timeZone: VENUE_TIME_ZONE,
    serverTimeOffsetMs,
    serverTimeAvailable,
  });
  const { entries: timeline, activeEntry: currentEntry, nextEntry } = driftReport;
  const activeIndex = timeline.findIndex((entry) => entry.isActive);
  const cakeProtocol = resolveCakeProtocol(WEDDING, timeline, activeIndex);
  const musicPolicy = resolveMusicPolicy(WEDDING, now, {
    eventDateISO: EVENT_DATE_ISO,
    timeZone: VENUE_TIME_ZONE,
  });
  const speeches = resolveSpeeches(WEDDING);
  const speechMode = resolveSpeechMode(WEDDING, speeches);
  const activeSpeech = resolveActiveSpeech(speeches, liveState.active_speech_id);
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
  const stepTypeClass = currentStep ? STEP_TYPE_STYLES[currentStep.type] ?? STEP_TYPE_STYLES.ELASTIC : '';
  const script = currentStep?.teleprompter?.type === "SPEECH" ? currentStep.teleprompter : null;
  const game = currentStep?.teleprompter?.type === "GAME_QUESTIONS" ? currentStep.teleprompter : null;
  const stepSubtasks = currentStep?.subTasks ?? [];
  const deferTarget = findDeferTarget(WEDDING.steps, liveState);
  const deferredSteps = WEDDING.steps.filter((step) =>
    liveState.deferred_step_ids?.includes(step.id),
  );

  // P0.7: block hard anchors, warn on photographer cues.
  const swapBlock = swapBlockReason(currentStep, nextEntry?.step ?? null);
  const swapWarn = swapNeedsWarning(currentStep, nextEntry?.step ?? null);
  const notifyUndo = (label) => setUndoToast({ id: Date.now(), label });

  const handleAddOffset = () => {
    addManualOffset(15);
    setControlNotice("Kitchen / vendor +15m offset applied.");
    notifyUndo('Manual offset +15m');
  };
  const handleClearOffset = () => {
    clearManualOffset();
    setControlNotice("Manual offset cleared.");
    notifyUndo('Manual offset cleared');
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
    setControlNotice(`Swapped ${currentStep.title} with ${nextEntry.step.title}.`);
    swapWithNext();
    notifyUndo('Swapped steps');
  };
  const handleDefer = () => {
    if (!deferTarget) return;
    setControlNotice(`Deferred ${deferTarget.title} to the Joker Drawer.`);
    deferToJokerDrawer();
    notifyUndo('Deferred to Joker Drawer');
  };
  const handleRestore = (stepId) => {
    const step = WEDDING.steps.find((candidate) => candidate.id === stepId);
    restoreDeferredStep(stepId);
    setControlNotice(`Restored ${step?.title ?? "block"} from the Joker Drawer.`);
    notifyUndo('Restored block');
  };
  const handleAdvance = () => {
    markCurrentDone();
    setControlNotice('Step marked done.');
    notifyUndo('Step completed');
  };
  const handleUndo = () => {
    if (!canUndo) return;
    undoLastStep();
    setUndoToast(null);
    setControlNotice('Last action undone.');
  };
  const handleOpenAnchor = (anchorElementId) => {
    setContactsOpen(false);
    window.setTimeout(() => {
      document
        .getElementById(anchorElementId)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const handleWipeEvent = async () => {
    if (IS_PRODUCTION && roleSession?.role === 'mc') {
      const client = createSupabaseSyncClient(SYNC_CONFIG, {
        accessToken: roleSession.token,
      });
      await client.wipeRoom();
    }
    clearActiveCartridge();
    clearLastKnownStep(WEDDING.weddingId);
    pairing.unpair();
    clearRoleSession();
    clearStoredHostKey();
    clearSpeakerScript(WEDDING.weddingId);
    window.location.reload();
  };

  const roleProps = {
    role: currentRole,
    roles: roleIds,
    onRoleChange: handleRoleChange
  };

  if (currentRole === "dj") {
    return (
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
          drift={driftReport.drift}
          musicPolicy={musicPolicy}
          stagePing={liveState.stage_ping}
          syncStatus={syncStatus}
          syncError={syncError}
          remoteUpdatedAt={remoteUpdatedAt}
          servicePackage={WEDDING.servicePackage}
          viewVisibility={WEDDING.viewVisibility?.dj}
          theme={theme}
          onToggleTheme={toggleTheme}
          {...roleProps}
        />
      </AppErrorBoundary>
    );
  }

  if (currentRole === "photo") {
    return (
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
          stagePing={liveState.stage_ping}
          hardAnchors={WEDDING.hardAnchors}
          syncStatus={syncStatus}
          syncError={syncError}
          remoteUpdatedAt={remoteUpdatedAt}
          theme={theme}
          onToggleTheme={toggleTheme}
          {...roleProps}
        />
      </AppErrorBoundary>
    );
  }

  if (currentRole === "speaker") {
    return (
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
          syncStatus={syncStatus}
          syncError={syncError}
          remoteUpdatedAt={remoteUpdatedAt}
          theme={theme}
          onToggleTheme={toggleTheme}
          canExit={!IS_PRODUCTION}
          onExit={() => handleRoleChange("mc")}
        />
      </AppErrorBoundary>
    );
  }

  if (currentRole === "pocket") {
    return (
      <AppErrorBoundary
        scope="pocket"
        weddingId={WEDDING.weddingId}
        role={currentRole}
        resetKey={currentRole}
        lastKnownStep={lastKnownStep}
      >
        <>
          <PocketRemoteView
            wedding={WEDDING}
            timeline={timeline}
            clock={driftReport.clock}
            drift={driftReport.drift}
            cake={cakeProtocol}
            musicPolicy={musicPolicy}
            theme={theme}
            onToggleTheme={toggleTheme}
            onAdvance={handleAdvance}
            onUndo={handleUndo}
            canUndo={canUndo}
            canAdvance={!isComplete}
            onOpenScript={() => setOverlay("teleprompter")}
            hasScript={Boolean(script)}
            syncStatus={syncStatus}
            syncError={syncError}
            remoteUpdatedAt={remoteUpdatedAt}
            {...roleProps}
          />
          {overlay === "teleprompter" && (
            <TeleprompterOverlay open step={currentStep} onClose={closeOverlay} />
          )}
          <UndoToast
            toast={undoToast}
            onUndo={handleUndo}
            onDismiss={() => setUndoToast(null)}
          />
        </>
      </AppErrorBoundary>
    );
  }

  const mcModel = {
    WEDDING,
    realStart,
    driftReport,
    vipAlerts,
    jokerCount,
    setImporterOpen,
    setContactsOpen,
    contacts,
    handleUnpair,
    IS_PRODUCTION,
    roleSession,
    pairing,
    roleIds,
    currentRole,
    handleRoleChange,
    theme,
    toggleTheme,
    syncStatus,
    syncError,
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
    musicPolicy,
    deferredSteps,
    handleRestore,
    sensitiveNotes,
    handleWipeEvent,
    speechMode,
    speeches,
    selectSpeech,
    sendStagePing,
    handleAddOffset,
    isComplete,
    manualOffset,
    handleClearOffset,
    handleSwap,
    swapBlock,
    handleDefer,
    deferTarget,
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
    importerOpen,
    contactsOpen,
    handleOpenAnchor,
  };

  return (
    <AppErrorBoundary
      scope="mc"
      weddingId={WEDDING.weddingId}
      role={currentRole}
      resetKey={currentRole}
      lastKnownStep={lastKnownStep}
    >
      <McMasterView model={mcModel} />
    </AppErrorBoundary>
  );
}
