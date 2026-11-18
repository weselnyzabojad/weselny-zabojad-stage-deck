// MC master view (project.md TODO 22).
//
// Extracted from the former App.jsx god component as a pure refactor. All state,
// live-sync effects and handlers stay in App.jsx; this file is the presentation
// layer for the MC role. The `model` object carries the already-derived values
// and callbacks so there is exactly one place to wire a future routed shell.

import { useId, useState } from 'react';
import CakeCard from '../components/CakeCard';
import { ceremonySubStepBodies } from '../components/ceremonySubStepBodies';
import DjSongRequestQueue from '../components/DjSongRequestQueue';
import RoleReadReceiptsRow from '../components/RoleReadReceiptsRow';import ModalShell from '../components/ModalShell';
import PostMortemAnalytics from '../components/PostMortemAnalytics';
import VenuePolicyWarnings from '../components/VenuePolicyWarnings';
import useVenuePolicies from '../hooks/useVenuePolicies.js';
import MusicPolicyCard from '../components/MusicPolicyCard';
import AttractionStrip from '../components/AttractionStrip';
import ChildrenExpectedBadge from '../components/ChildrenExpectedBadge';
import GrandEntranceCueCard from '../components/GrandEntranceCueCard';
import FirstDanceCueCard from '../components/FirstDanceCueCard';
import GamesCueCard from '../components/GamesCueCard';
import CulturalRulesBar from '../components/CulturalRulesBar';
import DriftPill from '../components/DriftPill';
import GameClickerOverlay from '../components/GameClickerOverlay';
import GroupPhotoChecklist from '../components/GroupPhotoChecklist';
import HardAnchorAlertBanner from '../components/HardAnchorAlertBanner';
import HoldToConfirmButton from '../components/HoldToConfirmButton';
import OczepinyCueCard from '../components/OczepinyCueCard';
import RoleShell from '../components/RoleShell';
import RoleSignOutControl from '../components/RoleSignOutControl';
import SecondaryControlBar from '../components/SecondaryControlBar';
import TimelineFocusStack from '../components/TimelineFocusStack';
import TopBarCenterIdentity from '../components/TopBarCenterIdentity';
import TopBarClock from '../components/TopBarClock';
import TopBarLogo from '../components/TopBarLogo';
import TopBarRoleLabel from '../components/TopBarRoleLabel';
import TopBarShell from '../components/TopBarShell';
import { useI18n } from '../i18n/useI18n';
import useCompact from '../hooks/useCompact';
import { mapMandatoryToSteps } from '../lib/mandatorySteps.js';
import { isPredefinedGameStep } from '../lib/gameQuestions.js';
import { resolveEventDateISO, resolveVenueTimeZone } from '../lib/eventTime.js';
import { resolveOczepinyIndicator } from '../lib/oczepinyIndicator';
import {
  resolveGroupPhotoStepId,
  resolvePhotographerAvailable,
  resolvePhotoPlan,
} from '../lib/photoPlan.js';
import { orderSubtasks } from '../lib/subtasks.js';

// Detect the moment from stable cartridge signals, never from the localized
// step title (issue #543). Titles are authored content and may be FR/PL.
function childrenWarningFor(step, cakeProtocol) {
  if (step?.id && cakeProtocol?.stepId && step.id === cakeProtocol.stepId) {
    return 'mc.step.childrenCake';
  }
  if (step?.grandEntranceOrder) {
    return 'mc.step.childrenEntrance';
  }
  if (step?.firstDanceMode) {
    return 'mc.step.childrenDancefloor';
  }
  return null;
}

// Undo labels are stored as data in the mutation log; translate the display
// from the stable `op` instead of persisting a localized label.
const UNDO_LABEL_KEYS = {
  complete_step: 'mc.undo.stepCompleted',
  swap: 'mc.undo.swappedSteps',
  toggle_subtask: 'mc.undo.subtaskChanged',
  select_speech: 'mc.undo.speechSelection',
  media_override: 'mc.undo.mediaOverride',
  schedule_change: 'mc.undo.scheduleChanged',
  game_results: 'mc.undo.gameResults',
};

function undoLabel(lastUndo, t) {
  const key = UNDO_LABEL_KEYS[lastUndo?.op];
  return key ? t(key) : lastUndo?.label ?? t('mc.undo.lastAction');
}
import SpeechesCard from '../components/SpeechesCard';
import SpeechesChip from '../components/SpeechesChip';
import StepMandatoryNotes from '../components/StepMandatoryNotes';
import SyncStatusBadge from '../components/SyncStatusBadge';
import TeleprompterOverlay from '../components/TeleprompterOverlay';
import UtilityControlGroup from '../components/UtilityControlGroup';
import LanguageToggle from '../components/LanguageToggle';
import ThemeToggle from '../components/ThemeToggle';
import OpenOnPhoneButton from '../components/OpenOnPhoneButton';
import SkipLink from '../components/SkipLink';
import UndoToast from '../components/UndoToast';
import MusicalSetBar from '../components/MusicalSetBar';

function LockedStepInfo() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  return (
    <div className="relative flex items-center gap-1">
      <button
        type="button"
        disabled
        aria-label={t('mc.reschedule.locked')}
        className="flex min-h-11 min-w-11 cursor-not-allowed items-center justify-center rounded-lg border border-line bg-card/70 text-sm text-muted opacity-60"
      >
        <span aria-hidden="true">🔒</span>
      </button>
      <button
        type="button"
        aria-label={t('mc.reschedule.info')}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setOpen((value) => !value)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-card/70 font-mono text-[11px] font-bold text-muted transition hover:border-line-strong hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-soft"
      >
        i
      </button>
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute right-0 top-full z-banner mt-1 w-52 rounded-lg border border-line bg-card px-3 py-2 text-left text-[11px] font-normal leading-snug text-ink shadow-2xl"
        >
          {t('mc.reschedule.locked')}
        </span>
      ) : null}
    </div>
  );
}

function StepTimeEditor({ entry, error, onApply, onClose }) {
  const { t } = useI18n();
  const [time, setTime] = useState(() => entry?.step?.time ?? '');
  const titleId = useId();
  if (!entry) return null;

  return (
    <ModalShell open onClose={onClose} labelledBy={titleId}>
      <form
        className="flex flex-col gap-3 p-5 pt-14"
        onSubmit={(event) => {
          event.preventDefault();
          onApply(time);
        }}
      >
        <div>
          <h2 id={titleId} className="font-heading text-lg font-bold text-ink">
            {t('mc.reschedule.title')}
          </h2>
          <p className="mt-1 text-xs text-muted">{t('mc.reschedule.description')}</p>
        </div>
        <p className="text-sm font-semibold text-ink">{entry.step?.title}</p>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-muted">
          {t('mc.reschedule.time')}
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            required
            autoFocus
            className="rounded-lg border border-line-strong bg-card px-3 py-2 font-mono text-base text-ink outline-none focus:border-brand-strong focus:ring-2 focus:ring-brand-strong/30"
          />
        </label>
        {error ? (
          <p role="alert" className="text-xs text-alert-soft">
            {error}
          </p>
        ) : null}
        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-line bg-raised px-3 py-2 text-xs font-semibold text-ink transition hover:bg-line"
          >
            {t('mc.reschedule.cancel')}
          </button>
          <button
            type="submit"
            className="min-h-11 rounded-lg border border-brand-strong bg-brand px-3 py-2 text-xs font-bold text-on-accent transition hover:bg-brand-hover"
          >
            {t('mc.reschedule.apply')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}


export default function McMasterView({ model }) {
  const {
  WEDDING,
  childrenExpected = false,
  driftReport,
  handleUnpair,
  IS_PRODUCTION,
  roleSession,
  pairing,
  currentRole,
  djMc = false,
  djMcAccessToken = null,
  djMcRoomCode = null,
  musicPolicy,
  silentFlash = null,
  receiptTarget = null,
  receiptClient = null,
  viewSwitch,
  roomCode,
  theme,
  toggleTheme,
  syncStatus,
  syncError,
  remoteUpdatedAt,
  outbox,
  currentStep,
  stepTypeClass,
  stepSubtasks,
  liveState,
  toggleSubtask,
  script,
  game,
  setOverlay,
  steps,
  completedCount,
  cakeProtocol,
  cakeServiceMode = 'KITCHEN_RETURN',
  speechMode,
  speeches,
  speechBundle = null,
  setGameResults,
  isComplete,
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
  onExtendMusicalSet = null,
  rescheduleStep = null,
  extensionAllowed = false,
  extensionUntil = null,
  closureTime = null,
  extensionBlockedReason = null,
} = model;

  const { t } = useI18n();
  const venueGuard = useVenuePolicies(
    currentStep?.tags,
    liveState?.media_overrides?.venuePolicies ?? null,
  );

  const oczepinyStatus = resolveOczepinyIndicator({
    wedding: WEDDING,
    now: driftReport?.clock?.now ?? null,
    eventDateISO: WEDDING?.dateISO ?? null,
    timeZone: driftReport?.clock?.timeZone ?? null,
  });
  const photoPlan = resolvePhotoPlan(WEDDING);
  const groupPhotoStepId = resolveGroupPhotoStepId(photoPlan, WEDDING?.steps);
  const mandatoryByStep = mapMandatoryToSteps(WEDDING, steps, { role: 'mc' });
  const mandatoryItems = currentStep ? mandatoryByStep[currentStep.id] ?? [] : [];
  const isGameStep = Boolean(currentStep?.game);
  const showGameBriefing = isGameStep && !isPredefinedGameStep(currentStep);
  const isCakeStep = Boolean(
    currentStep && cakeProtocol?.stepId && currentStep.id === cakeProtocol.stepId,
  );
  const childrenWarning = childrenExpected
    ? childrenWarningFor(currentStep, cakeProtocol)
    : null;
  const groupPhotoBody =
    currentStep?.id && currentStep.id === groupPhotoStepId && photoPlan?.groupPhotos ? (
      <GroupPhotoChecklist
        groups={photoPlan.groupPhotos.groups}
        location={photoPlan.groupPhotos.location}
        description={photoPlan.groupPhotos.description}
        mediaTeam={WEDDING?.mediaTeam}
        checked={liveState.checked_subtasks}
        onToggle={toggleSubtask}
      />
    ) : null;

  const isCompact = useCompact();
  const [editingStepId, setEditingStepId] = useState(null);
  const [editorError, setEditorError] = useState('');
  const [postMortemOpen, setPostMortemOpen] = useState(false);

  const railEntries = driftReport.entries ?? [];
  const railActiveIndex = railEntries.findIndex((entry) => entry.isActive);
  const editingEntry = editingStepId
    ? railEntries.find((entry) => entry.step?.id === editingStepId) ?? null
    : null;

  const rescheduleActions = {};
  if (rescheduleStep) {
    for (const entry of railEntries) {
      const step = entry?.step;
      if (!step || entry.isActive || entry.isDone) continue;
      if (step.type === 'HARD_ANCHOR' || step.mandatory) {
        rescheduleActions[step.id] = <LockedStepInfo />;
        continue;
      }
      if (step.type !== 'FLEXIBLE') continue;
      rescheduleActions[step.id] = (
        <button
          type="button"
          title={t('mc.reschedule.actionLabel', { title: step.title })}
          aria-label={t('mc.reschedule.actionLabel', { title: step.title })}
          onClick={() => {
            setEditorError('');
            setEditingStepId(step.id);
          }}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-card/70 text-sm text-ink transition hover:border-line-strong hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-soft"
        >
          <span aria-hidden="true">✎</span>
        </button>
      );
    }
  }

  const applyReschedule = (time) => {
    if (!rescheduleStep || !editingStepId) return;
    const result = rescheduleStep(editingStepId, time);
    if (!result || result.error) {
      setEditorError(t('mc.reschedule.error'));
      return;
    }
    setEditorError('');
    setEditingStepId(null);
    setUndoToast({ id: Date.now(), label: t('mc.undo.scheduleChanged') });
  };
  const activeMusicalSetEntry =
    railEntries.find((entry) => entry.isActive && entry.step?.optionalFlag === 'dj_set') ?? null;

  // Compact (phone) content: the same shared focus stack as the desktop rail,
  // plus the MC-only advance/undo controls inside the current card.
  const compactCurrentBody = currentStep ? (
    <div className="flex flex-col gap-2">
      <span
        className={`w-fit rounded-full border px-2.5 py-1 font-heading text-xs font-semibold uppercase tracking-wider shadow-sm ${stepTypeClass}`}
      >
        {t('mc.step.type', { type: currentStep.type.replace('_', ' ') })}
      </span>
      {currentStep.grandEntranceOrder ? <GrandEntranceCueCard step={currentStep} /> : null}
      {currentStep.firstDanceMode ? (
        <FirstDanceCueCard step={currentStep} audience="mc" />
      ) : null}
      {showGameBriefing ? (
        <GamesCueCard wedding={WEDDING} role="mc" gameId={currentStep.game.id} />
      ) : null}
      {isCakeStep ? (
        <CakeCard cake={cakeProtocol} cakeServiceMode={cakeServiceMode} compact />
      ) : null}
      {isCakeStep ? null : <StepMandatoryNotes items={mandatoryItems} showHeading={false} />}
      {groupPhotoBody}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleUndo}
          disabled={!canUndo}
          className={`min-h-12 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition ${!canUndo ? 'bg-card text-muted border-line cursor-not-allowed' : 'bg-panel/60 text-ink border-panel-border hover:border-line-strong hover:bg-panel'}`}
        >
          ↩ {t('mc.step.undo')}
        </button>
        <HoldToConfirmButton
          onConfirm={handleAdvance}
          disabled={isComplete}
          label={isComplete ? t('mc.step.eventComplete') : t('mc.step.holdAdvance')}
          holdLabel={t('mc.step.holdHint')}
          className={`min-h-12 flex-1 rounded-xl border px-4 py-2 text-sm font-bold shadow-sm ${isComplete ? 'bg-card text-muted border-line' : 'bg-brand hover:bg-brand-hover active:bg-brand-active text-on-accent border-brand-strong'}`}
        />
      </div>
      {script ? (
        <button
          type="button"
          onClick={() => setOverlay('teleprompter')}
          className="w-full rounded-xl border border-panel-border bg-panel/60 px-3 py-2 text-xs font-semibold text-ink shadow-sm backdrop-blur-sm transition hover:border-line-strong hover:bg-panel hover:shadow-md"
        >
          📖 {t('mc.step.openTeleprompter')}
        </button>
      ) : null}
      <div className="text-xs text-muted font-mono">
        {t('mc.step.completed', { done: completedCount, total: steps.length })}
      </div>
    </div>
  ) : null;

  const compactContent = (
    <div id="main-content" tabIndex={-1} className="space-y-4">
      {postMortemControl}
      {driftReport.hardAnchorRadar.hasWarning ? (
        <HardAnchorAlertBanner radar={driftReport.hardAnchorRadar} />
      ) : null}

      <DriftPill drift={driftReport.drift} compact />

      <AttractionStrip
        attractions={WEDDING.attractions}
        now={driftReport.clock?.now}
        eventDateISO={resolveEventDateISO(WEDDING)}
        timeZone={resolveVenueTimeZone(WEDDING)}
        compact
      />

      {railEntries.length > 0 ? (
        <TimelineFocusStack
          compact
          entries={railEntries}
          activeIndex={railActiveIndex}
          currentBody={compactCurrentBody}
          photographerAvailable={resolvePhotographerAvailable(WEDDING)}
          polished
          entryActions={rescheduleActions}
          entryBodies={ceremonySubStepBodies(railEntries)}
          flash={silentFlash}
          currentFooter={<RoleReadReceiptsRow target={receiptTarget} client={receiptClient} />}
        />
      ) : null}

      {!currentStep ? (
        <div className="bg-card/95 border border-line rounded-xl p-4 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-xs uppercase tracking-widest text-emerald-300 font-semibold">
            {t('mc.step.eventCompleteTitle')}
          </div>
          <div className="text-sm text-muted mt-1">
            {t('mc.step.completed', { done: completedCount, total: steps.length })}
          </div>
        </div>
      ) : null}

    </div>
  );

  // Hero body: the current step's cues, sub-tasks and launchers live inside the
  // centre card of the Stage Rail.
  const heroBody = currentStep ? (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 pb-2 text-[11px] text-muted">
        <span className="font-mono text-[10px] text-muted">
          {t('mc.step.completed', { done: completedCount, total: steps.length })}
        </span>
      </div>

      <AttractionStrip
        attractions={WEDDING.attractions}
        now={driftReport.clock?.now}
        eventDateISO={resolveEventDateISO(WEDDING)}
        timeZone={resolveVenueTimeZone(WEDDING)}
      />

      <VenuePolicyWarnings warnings={venueGuard.warnings} />

      {childrenWarning ? (
        <div className="flex items-start gap-2 rounded-xl border border-tone-warning-border bg-tone-warning-bg p-2.5 text-sm text-tone-warning-text">
          <span aria-hidden="true" className="mt-0.5 text-sm">⚠️</span>
          <span>{t(childrenWarning)}</span>
        </div>
      ) : null}

      {currentStep.notes ? (
        <div className="rounded-2xl border border-panel-border bg-panel/40 p-3.5 shadow-sm backdrop-blur-sm">
          <h3 className="mb-2 flex items-center gap-2 font-heading text-xs font-bold uppercase tracking-wider text-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-soft"></span>
            <span>📝 {t('mc.step.notesTitle')}</span>
          </h3>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
            {currentStep.notes}
          </p>
        </div>
      ) : null}

      {currentStep.grandEntranceOrder ? <GrandEntranceCueCard step={currentStep} /> : null}
      {currentStep.firstDanceMode ? (
        <FirstDanceCueCard step={currentStep} audience="mc" />
      ) : null}
      {showGameBriefing ? (
        <GamesCueCard wedding={WEDDING} role="mc" gameId={currentStep.game.id} />
      ) : null}

      {isCakeStep ? (
        <CakeCard cake={cakeProtocol} cakeServiceMode={cakeServiceMode} />
      ) : null}

      {currentStep.optionalFlag === 'oczepiny' || /oczepiny/i.test(currentStep.title) ? (
        <OczepinyCueCard wedding={WEDDING} audience="mc" />
      ) : null}

      {isCakeStep ? null : <StepMandatoryNotes items={mandatoryItems} showHeading={false} />}
      {groupPhotoBody}

      {stepSubtasks.length > 0 ? (
        <div className="rounded-2xl border border-panel-border bg-panel/40 p-3.5 shadow-sm backdrop-blur-sm">
          <h3 className="mb-2 font-heading text-xs font-bold uppercase tracking-wider text-ink">
            📋 {t('mc.step.subtasksTitle')}
          </h3>
          <div className="space-y-2">
            {orderSubtasks(stepSubtasks, liveState.checked_subtasks).map((task) => {
              const checked = Boolean(liveState.checked_subtasks[task]);
              return (
                <label
                  key={task}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-brand-soft focus-within:ring-offset-2 focus-within:ring-offset-page ${checked ? 'border-brand/30 bg-brand/10 text-muted' : 'border-line bg-card text-ink hover:border-line-strong hover:bg-card/80 hover:shadow-sm'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSubtask(task)}
                    className="h-6 w-6 shrink-0 rounded bg-page border-slate-700 focus:ring-brand"
                  />
                  <span className={`text-sm ${checked ? 'line-through' : ''}`}>{task}</span>
                  {checked ? (
                    <span
                      aria-hidden="true"
                      className="ml-auto rounded-full border border-brand/30 bg-brand/15 px-2 py-0.5 font-mono text-[9px] font-bold text-brand-soft"
                    >
                      ✓
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      {script || game ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            {script && (
              <button
                type="button"
                onClick={() => setOverlay('teleprompter')}
                className="rounded-xl border border-panel-border bg-panel/60 px-3.5 py-2 font-heading text-xs font-semibold text-ink shadow-sm backdrop-blur-sm transition hover:border-line-strong hover:bg-panel hover:shadow-md"
              >
                📖 {t('mc.step.openTeleprompter')}
              </button>
            )}
            {isGameStep && game?.loading && (
              <span className="rounded-xl border border-line bg-card px-3.5 py-2 font-heading text-xs font-semibold text-muted">
                {t('game.loading')}
              </span>
            )}
            {isGameStep && game?.unavailable && (
              <span className="rounded-xl border border-amber-700 bg-amber-950/50 px-3.5 py-2 font-heading text-xs font-semibold text-amber-100">
                {t('games.unavailableHelp')}
              </span>
            )}
            {isGameStep && game && !game.loading && !game.unavailable && (
              <button
                type="button"
                onClick={() => setOverlay('game')}
                className="rounded-xl border border-brand-strong/60 bg-brand/20 px-3.5 py-2 font-heading text-xs font-semibold text-ink shadow-sm transition hover:bg-brand/30 hover:shadow-md"
              >
                🎮 {t('mc.step.gameClicker', { count: game.items.length })}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  ) : null;

  const hasAnchorWarning = driftReport.hardAnchorRadar.hasWarning;
  const pinControl = (
    <RoleSignOutControl
      isProduction={IS_PRODUCTION}
      role={roleSession?.role ?? currentRole ?? 'mc'}
      pin={pairing?.pin ?? null}
      onSignOut={IS_PRODUCTION ? handleUnpair : undefined}
    />
  );
  const syncControl = (
    <SyncStatusBadge
      status={syncStatus}
      error={syncError}
      remoteUpdatedAt={remoteUpdatedAt}
      outbox={outbox}
    />
  );
  const utilityGroup = (
    <UtilityControlGroup>
      <LanguageToggle variant="desktop" />
      <ThemeToggle theme={theme} onToggle={toggleTheme} variant="desktop" />
    </UtilityControlGroup>
  );
  const postMortemControl = isComplete ? (
    <button
      type="button"
      onClick={() => setPostMortemOpen(true)}
      className="min-h-10 rounded-lg border border-line-strong bg-raised px-2.5 py-1.5 text-[10px] font-semibold text-ink transition hover:bg-line"
    >
      {t('postMortem.open')}
    </button>
  ) : null;
  const postMortemModal = (
    <PostMortemAnalytics
      open={postMortemOpen}
      onClose={() => setPostMortemOpen(false)}
      steps={WEDDING?.steps ?? steps ?? []}
      liveState={liveState}
      closureTime={closureTime}
    />
  );

  const wideContent = (
    <>
      <SkipLink />
      <div className="h-dvh bg-page text-ink font-body flex flex-col justify-between overflow-hidden antialiased">
      
      {/* ================= TOP BAR ================= */}
      <TopBarShell
        left={(
          <>
            <TopBarLogo imgClassName="max-w-[220px]" />
            <span aria-hidden="true" className="hidden h-8 w-px shrink-0 bg-panel-border sm:block" />
            <TopBarClock clock={driftReport.clock} />
            <TopBarRoleLabel role="mc" />
          </>
        )}
        center={<TopBarCenterIdentity wedding={WEDDING} />}
        right={(
          <>
            {viewSwitch}
            <ChildrenExpectedBadge wedding={WEDDING} inline />
          </>
        )}
      />

      {djMc && activeMusicalSetEntry ? (
        <MusicalSetBar
          key={activeMusicalSetEntry?.step?.id ?? 'musical-set'}
          wedding={WEDDING}
          clock={driftReport.clock}
          activeEntry={activeMusicalSetEntry}
          onExtend={onExtendMusicalSet}
          extensionAllowed={extensionAllowed}
          extensionUntil={extensionUntil}
          closureTime={closureTime}
          extensionBlockedReason={extensionBlockedReason}
        />
      ) : null}

      <SecondaryControlBar
        left={(
          <>
            {syncControl}
            {pinControl}
            <DriftPill drift={driftReport.drift} />
          </>
        )}
        center={
          <CulturalRulesBar
            rules={WEDDING.culturalRules}
            oczepinyStatus={oczepinyStatus}
            grid
            dense
          >
            <SpeechesChip mode={speechMode} speeches={speeches} dense />
          </CulturalRulesBar>
        }
        right={(
          <>
            {utilityGroup}
            <OpenOnPhoneButton role={currentRole} roomCode={roomCode} />
          </>
        )}
      />

      {djMc ? (
        <DjSongRequestQueue
          enabled
          role="dj_mc"
          accessToken={djMcAccessToken}
          roomCode={djMcRoomCode}
          variant="bar"
          discoPoloPolicy={musicPolicy?.discoPoloPolicy ?? 'NO'}
        />
      ) : null}

      {hasAnchorWarning ? (
        <HardAnchorAlertBanner radar={driftReport.hardAnchorRadar} />
      ) : null}

      {/* ================= STAGE RAIL + DETAILS ================= */}
      <main id="main-content" tabIndex={-1} className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          <TimelineFocusStack
            entries={railEntries}
            activeIndex={railActiveIndex}
            currentBody={heroBody}
            photographerAvailable={resolvePhotographerAvailable(WEDDING)}
            polished
            entryActions={rescheduleActions}
            entryBodies={ceremonySubStepBodies(railEntries)}
            flash={silentFlash}
            currentFooter={<RoleReadReceiptsRow target={receiptTarget} client={receiptClient} />}
          />

          {speechMode !== 'OFF' && speeches?.length > 0 ? (
            <SpeechesCard mode={speechMode} speeches={speeches} speechBundle={speechBundle} />
          ) : null}

          {djMc ? (
            <section aria-label="DJ VIP" className="space-y-4">
              <MusicPolicyCard policy={musicPolicy} />
            </section>
          ) : null}
        </div>
      </main>

      {/* ================= BOTTOM BAR (STATUS & PRIMARY ACTION) ================= */}
      <footer className="bg-card border-t border-line px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        
        <div className="flex items-center space-x-2 overflow-x-auto py-1">
          {controlNotice ? (
            <span
              aria-live="polite"
              title={controlNotice}
              className="max-w-[240px] truncate rounded-lg border border-line-strong bg-raised px-2.5 py-1.5 text-[10px] text-ink"
            >
              {controlNotice}
            </span>
          ) : null}
          <span
            title={t('mc.title.savedLocally')}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono whitespace-nowrap border ${savedLocally ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-amber-950/70 border-amber-800 text-amber-300'}`}
          >
            {savedLocally ? t('mc.savedLocally') : t('mc.localSaveUnavailable')}
          </span>
          {postMortemControl}
        </div>

        {/* Undo + Primary Action Button */}
        <div className="flex items-center space-x-3 ml-auto">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            title={
              canUndo
                ? t('mc.undo.title', { label: undoLabel(lastUndo, t) })
                : t('mc.undo.nothing')
            }
            className={`min-h-12 px-3 py-2.5 rounded-xl text-sm font-heading font-semibold transition border ${!canUndo ? 'bg-card text-muted border-line cursor-not-allowed' : 'bg-raised hover:bg-line text-ink border-line-strong'}`}
          >
            ↩ {t('mc.step.undo')}
          </button>
          <HoldToConfirmButton
            onConfirm={handleAdvance}
            disabled={isComplete}
            label={isComplete ? t('mc.step.eventComplete') : t('mc.step.holdAdvance')}
            holdLabel={t('mc.step.holdHint')}
            className={`min-h-12 px-6 py-2.5 rounded-xl text-sm font-heading font-bold transition border ${isComplete ? 'bg-card text-muted border-line' : 'bg-brand hover:bg-brand-hover active:bg-brand-active text-on-accent shadow-lg shadow-blue-950/60 border-brand-strong'}`}
          />
        </div>

      </footer>

      {overlay === "teleprompter" && (
        <TeleprompterOverlay open step={currentStep} onClose={closeOverlay} />
      )}
      {overlay === "game" && isGameStep && game && !game.unavailable && !game.loading && (
        <GameClickerOverlay
          open
          game={game}
          weddingId={WEDDING.weddingId}
          results={game?.id ? liveState?.game_results?.[game.id] ?? null : null}
          onResultsChange={setGameResults}
          onClose={closeOverlay}
        />
      )}
      <UndoToast
        toast={undoToast}
        onUndo={handleUndo}
        onDismiss={() => setUndoToast(null)}
      />
      {editingEntry ? (
        <StepTimeEditor
          key={editingEntry.step?.id}
          entry={editingEntry}
          error={editorError}
          onApply={applyReschedule}
          onClose={() => {
            setEditingStepId(null);
            setEditorError('');
          }}
        />
      ) : null}
      {postMortemModal}

      </div>
    </>
  );

  if (!isCompact) {
    return wideContent;
  }

  return (
    <RoleShell
      compact
      role={currentRole}
      clock={driftReport.clock}
      pin={pairing?.pin ?? null}
      wedding={WEDDING}
      syncStatus={syncStatus}
      syncError={syncError}
      remoteUpdatedAt={remoteUpdatedAt}
      outbox={outbox}
      onToggleTheme={toggleTheme}
      theme={theme}
      culturalRules={WEDDING.culturalRules}
      oczepinyStatus={oczepinyStatus}
      speeches={speeches}
      speechMode={speechMode}
      viewSwitch={viewSwitch}
    >
      {djMc ? (
        <DjSongRequestQueue
          enabled
          role="dj_mc"
          accessToken={djMcAccessToken}
          roomCode={djMcRoomCode}
          variant="bar"
          discoPoloPolicy={musicPolicy?.discoPoloPolicy ?? 'NO'}
        />
      ) : null}
      {djMc && activeMusicalSetEntry ? (
        <MusicalSetBar
          key={activeMusicalSetEntry?.step?.id ?? 'musical-set'}
          wedding={WEDDING}
          clock={driftReport.clock}
          activeEntry={activeMusicalSetEntry}
          onExtend={onExtendMusicalSet}
          extensionAllowed={extensionAllowed}
          extensionUntil={extensionUntil}
          closureTime={closureTime}
          extensionBlockedReason={extensionBlockedReason}
        />
      ) : null}
      {compactContent}
      <UndoToast
        toast={undoToast}
        onUndo={handleUndo}
        onDismiss={() => setUndoToast(null)}
      />
      {editingEntry ? (
        <StepTimeEditor
          key={editingEntry.step?.id}
          entry={editingEntry}
          error={editorError}
          onApply={applyReschedule}
          onClose={() => {
            setEditingStepId(null);
            setEditorError('');
          }}
        />
      ) : null}
      {postMortemModal}
    </RoleShell>
  );
}
