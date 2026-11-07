// MC master view (project.md TODO 22).
//
// Extracted from the former App.jsx god component as a pure refactor. All state,
// live-sync effects and handlers stay in App.jsx; this file is the presentation
// layer for the MC role. The `model` object carries the already-derived values
// and callbacks so there is exactly one place to wire a future routed shell.

import { useEffect, useState } from 'react';
import logo from '../assets/img/logo.png';
import CakeCard from '../components/CakeCard';
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
import SecondaryControlBar from '../components/SecondaryControlBar';
import TimelineFocusStack from '../components/TimelineFocusStack';
import TopBarCenterIdentity from '../components/TopBarCenterIdentity';
import TopBarClock from '../components/TopBarClock';
import TopBarRoleLabel from '../components/TopBarRoleLabel';
import TopBarShell from '../components/TopBarShell';
import { mapMandatoryToSteps } from '../lib/mandatorySteps.js';
import { resolveOczepinyIndicator } from '../lib/oczepinyIndicator';
import { resolveGroupPhotoStepId, resolvePhotoPlan } from '../lib/photoPlan.js';
import { orderSubtasks } from '../lib/subtasks.js';

function childrenWarningFor(step) {
  const title = String(step?.title ?? '').toLowerCase();
  if (/wedding cake|cake cutting/.test(title)) {
    return 'Children expected — keep them clear of the cake table and cutting area.';
  }
  if (/grand entrance/.test(title)) {
    return 'Children expected — keep them out of the entrance aisle.';
  }
  if (/first dance/.test(title)) {
    return 'Children expected — keep them clear of the dancefloor.';
  }
  return null;
}
import SpeechesCard from '../components/SpeechesCard';
import SpeechesChip from '../components/SpeechesChip';
import StepMandatoryNotes from '../components/StepMandatoryNotes';
import SyncStatusBadge from '../components/SyncStatusBadge';
import TeleprompterOverlay from '../components/TeleprompterOverlay';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';
import OpenOnPhoneButton from '../components/OpenOnPhoneButton';
import SkipLink from '../components/SkipLink';
import UndoToast from '../components/UndoToast';
import { CONTROL_BUTTON_BASE, CONTROL_BUTTON_DISABLED } from '../lib/styleConstants';

export default function McMasterView({ model }) {
  const {
  WEDDING,
  childrenExpected = false,
  realStart,
  driftReport,
  handleUnpair,
  IS_PRODUCTION,
  roleSession,
  pairing,
  currentRole,
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
  estimatedEnd,
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
  cakeServiceMode = 'KITCHEN_RETURN',
  mandatoryOverride = null,
  speechMode,
  speeches,
  selectSpeech,
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
} = model;

  const oczepinyStatus = resolveOczepinyIndicator({
    wedding: WEDDING,
    now: driftReport?.clock?.now ?? null,
    eventDateISO: WEDDING?.dateISO ?? null,
    timeZone: driftReport?.clock?.timeZone ?? null,
  });
  const photoPlan = resolvePhotoPlan(WEDDING);
  const groupPhotoStepId = resolveGroupPhotoStepId(photoPlan, WEDDING?.steps);
  const mandatoryByStep = mapMandatoryToSteps(WEDDING, WEDDING?.steps, {
    role: 'mc',
    override: mandatoryOverride,
  });
  const mandatoryItems = currentStep ? mandatoryByStep[currentStep.id] ?? [] : [];
  const groupPhotoBody =
    currentStep?.id && currentStep.id === groupPhotoStepId && photoPlan?.groupPhotos ? (
      <GroupPhotoChecklist
        groups={photoPlan.groupPhotos.groups}
        location={photoPlan.groupPhotos.location}
        mediaTeam={WEDDING?.mediaTeam}
        checked={liveState.checked_subtasks}
        onToggle={toggleSubtask}
      />
    ) : null;

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

  const railEntries = driftReport.entries ?? [];
  const railActiveIndex = railEntries.findIndex((entry) => entry.isActive);

  // Compact (phone) content: the same shared focus stack as the desktop rail,
  // plus the MC-only advance/undo controls inside the current card.
  const compactCurrentBody = currentStep ? (
    <div className="flex flex-col gap-2">
      <span
        className={`w-fit rounded border px-2.5 py-1 font-heading text-xs font-semibold uppercase tracking-wider ${stepTypeClass}`}
      >
        {currentStep.type.replace('_', ' ')} STEP
      </span>
      <div className="flex items-center justify-between rounded-lg border border-line bg-page/80 p-2 text-xs font-mono">
        <span>Real start: <strong className="text-white">{realStart}</strong></span>
        <span>Est. end: <strong className="text-white">{estimatedEnd ?? '—'}</strong></span>
      </div>
      {currentStep.grandEntranceOrder ? <GrandEntranceCueCard step={currentStep} /> : null}
      {currentStep.firstDanceMode ? (
        <FirstDanceCueCard step={currentStep} audience="mc" />
      ) : null}
      {currentStep.optionalFlag === 'games' || /games/i.test(currentStep.title) ? (
        <GamesCueCard wedding={WEDDING} role="mc" />
      ) : null}
      <StepMandatoryNotes items={mandatoryItems} />
      {groupPhotoBody}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleUndo}
          disabled={!canUndo}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border ${!canUndo ? 'bg-card text-slate-600 border-line cursor-not-allowed' : 'bg-raised hover:bg-line text-slate-200 border-line-strong'}`}
        >
          ↩ Undo
        </button>
        <HoldToConfirmButton
          onConfirm={handleAdvance}
          disabled={isComplete}
          label={isComplete ? 'EVENT COMPLETE ✓' : 'HOLD TO ADVANCE ➔'}
          holdLabel="hold 1.2s"
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold border ${isComplete ? 'bg-card text-slate-500 border-line' : 'bg-brand hover:bg-brand-hover active:bg-brand-active text-white border-brand-strong'}`}
        />
      </div>
      {script ? (
        <button
          type="button"
          onClick={() => setOverlay('teleprompter')}
          className="w-full bg-raised hover:bg-line text-slate-200 px-3 py-2 rounded-lg text-xs font-semibold border border-line-strong"
        >
          📖 Open teleprompter / script
        </button>
      ) : null}
      <div className="text-xs text-slate-400 font-mono">{completedCount} / {steps.length} completed</div>
    </div>
  ) : null;

  const compactContent = (
    <div id="main-content" tabIndex={-1} className="space-y-4">
      {driftReport.hardAnchorRadar.hasWarning ? (
        <HardAnchorAlertBanner radar={driftReport.hardAnchorRadar} childrenExpected={childrenExpected} />
      ) : null}

      <DriftPill drift={driftReport.drift} compact />

      {railEntries.length > 0 ? (
        <TimelineFocusStack
          compact
          entries={railEntries}
          activeIndex={railActiveIndex}
          currentBody={compactCurrentBody}
        />
      ) : null}

      {!currentStep ? (
        <div className="bg-card/95 border border-line rounded-xl p-4 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-xs uppercase tracking-widest text-emerald-300 font-semibold">Event complete</div>
          <div className="text-sm text-slate-400 mt-1">{completedCount} / {steps.length} completed</div>
        </div>
      ) : null}

    </div>
  );

  // Hero body: the current step's cues, sub-tasks and launchers live inside the
  // centre card of the Stage Rail.
  const heroBody = currentStep ? (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 pb-2 text-[11px] text-slate-400">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>
            Planned:{' '}
            <span className="line-through text-slate-500">
              {currentStep.planned || currentStep.time}
            </span>
          </span>
          <span className="text-slate-600">·</span>
          <span>
            Real start: <span className="font-mono text-white">{realStart}</span>
          </span>
          <span className="text-slate-600">·</span>
          <span>
            Est. end: <span className="font-mono text-white">{estimatedEnd ?? '—'}</span>
          </span>
        </div>
        <span className="font-mono text-[10px] text-slate-500">
          {completedCount} / {steps.length} completed
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* MC Cues */}
        <div className="bg-page/60 p-3 rounded-lg border border-line">
          <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-alert"></span>
            <span>🗣️ MC Cues</span>
          </h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {childrenExpected && childrenWarningFor(currentStep) ? (
              <li className="flex items-start space-x-2 rounded border border-amber-700/60 bg-amber-950/40 p-2 text-amber-100">
                <span aria-hidden="true" className="mt-0.5 text-sm">⚠️</span>
                <span>{childrenWarningFor(currentStep)}</span>
              </li>
            ) : null}
            <li className="flex items-start space-x-2">
              <span>Inform guests: NO Sto Lat tonight!</span>
            </li>
            <li className="flex items-start space-x-2">
              <span>Explain Polish Steak Tartare + Vodka tradition.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span>Announce Instax + Guestbook + 1st Anniv Bottle.</span>
            </li>
          </ul>
        </div>
      </div>

      {currentStep.grandEntranceOrder ? <GrandEntranceCueCard step={currentStep} /> : null}
      {currentStep.firstDanceMode ? (
        <FirstDanceCueCard step={currentStep} audience="mc" />
      ) : null}
      {currentStep.optionalFlag === 'games' || /games/i.test(currentStep.title) ? (
        <GamesCueCard wedding={WEDDING} role="mc" />
      ) : null}

      {cakeProtocol?.stepId && currentStep.id === cakeProtocol.stepId ? (
        <>
          <CakeCard cake={cakeProtocol} />
          <div className="rounded-lg border border-amber-700/60 bg-amber-950/40 p-2.5 text-[11px] text-amber-100">
            <div className="font-heading text-[10px] font-bold uppercase tracking-widest text-amber-200">
              Cake service
            </div>
            <div className="mt-0.5">
              {cakeServiceMode === 'CUT_IN_PLACE'
                ? 'Cut in place — ask guests to come to the cake spot for a piece.'
                : 'Kitchen return — service will take the cake and return plated pieces.'}
            </div>
          </div>
        </>
      ) : null}

      {currentStep.optionalFlag === 'oczepiny' || /oczepiny/i.test(currentStep.title) ? (
        <OczepinyCueCard wedding={WEDDING} audience="mc" />
      ) : null}

      <StepMandatoryNotes items={mandatoryItems} />
      {groupPhotoBody}

      {stepSubtasks.length > 0 ? (
        <div className="bg-page/70 p-3 rounded-lg border border-line">
          <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider mb-2">📋 Sub-tasks</h3>
          <div className="space-y-2">
            {orderSubtasks(stepSubtasks, liveState.checked_subtasks).map((task) => {
              const checked = Boolean(liveState.checked_subtasks[task]);
              return (
                <label
                  key={task}
                  className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition focus-within:ring-2 focus-within:ring-brand-soft focus-within:ring-offset-2 focus-within:ring-offset-page ${checked ? 'bg-brand/20 border border-brand/40 text-slate-400' : 'bg-card border border-line text-slate-200 hover:border-line-strong'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSubtask(task)}
                    className="w-4 h-4 shrink-0 rounded bg-page border-slate-700 focus:ring-brand"
                  />
                  <span className={`text-sm ${checked ? 'line-through' : ''}`}>{task}</span>
                  {checked ? (
                    <span
                      aria-hidden="true"
                      className="ml-auto rounded border border-brand/40 bg-brand/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-brand-tint"
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

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {script && (
            <button
              type="button"
              onClick={() => setOverlay('teleprompter')}
              className="bg-raised hover:bg-line text-slate-200 px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition border border-line-strong"
            >
              📖 Open Teleprompter / Script
            </button>
          )}
          {game && (
            <button
              type="button"
              onClick={() => setOverlay('game')}
              className="bg-brand/40 hover:bg-brand/70 text-white px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition border border-brand-strong"
            >
              🎮 Game Clicker ({game.items.length} Qs)
            </button>
          )}
          {!script && !game && (
            <span className="text-xs text-slate-500 font-mono">No script attached to this step.</span>
          )}
        </div>
      </div>
    </div>
  ) : null;

  const hasAnchorWarning = driftReport.hardAnchorRadar.hasWarning;
  const pinControl = (
    <button
      type="button"
      onClick={handleUnpair}
      title={
        IS_PRODUCTION
          ? 'Sign out of this role'
          : 'Paired room PIN — click to forget this device'
      }
      className="text-slate-400 hover:text-white transition"
    >
      {IS_PRODUCTION ? (
        <>
          ROLE: <strong className="text-white">{roleSession.role.toUpperCase()}</strong>
          <span className="ml-1 text-[10px]">🔐</span>
        </>
      ) : (
        <>
          PIN: <strong className="text-white">{pairing.pin}</strong>
          <span className="ml-1 text-[10px]">🔓</span>
        </>
      )}
    </button>
  );
  const syncControl = (
    <SyncStatusBadge
      status={syncStatus}
      error={syncError}
      remoteUpdatedAt={remoteUpdatedAt}
      outbox={outbox}
    />
  );

  const wideContent = (
    <>
      <SkipLink />
      <div className="h-screen bg-page text-slate-100 font-body flex flex-col justify-between select-none overflow-hidden antialiased">
      
      {/* ================= TOP BAR ================= */}
      <TopBarShell
        left={(
          <>
            <div className="bg-white px-3 py-1.5 rounded-lg shadow-md flex items-center justify-center">
              <img
                src={logo}
                alt="Weselny Żabojad"
                className="h-12 w-auto object-contain max-w-[220px]"
              />
            </div>
            <span className="text-slate-500 hidden sm:inline">|</span>
            <TopBarClock clock={driftReport.clock} />
            <TopBarRoleLabel role="mc" />
          </>
        )}
        center={<TopBarCenterIdentity wedding={WEDDING} />}
        right={(
          <>
            <CulturalRulesBar
              rules={WEDDING.culturalRules}
              oczepinyStatus={oczepinyStatus}
            />
            <SpeechesChip
              mode={speechMode}
              speeches={speeches}
              activeSpeechId={liveState.active_speech_id}
            />
            {viewSwitch}
          </>
        )}
      />

      <SecondaryControlBar
        left={(
          <>
            <DriftPill drift={driftReport.drift} />
            {pinControl}
            {syncControl}
          </>
        )}
        center={(
          <ChildrenExpectedBadge
            wedding={WEDDING}
            role={currentRole}
            inline
            allowMc
          />
        )}
        right={(
          <>
            <OpenOnPhoneButton role={currentRole} roomCode={roomCode} />
            <LanguageToggle />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </>
        )}
      />

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
          />

          {speeches?.length > 0 ? (
            <SpeechesCard
              wedding={WEDDING}
              mode={speechMode}
              speeches={speeches}
              activeSpeechId={liveState.active_speech_id}
              onSelect={selectSpeech}
              clock={driftReport.clock}
            />
          ) : null}
        </div>
      </main>

      {/* ================= BOTTOM BAR (DRIFT CONTROLS & PRIMARY ACTION) ================= */}
      <footer className="bg-card border-t border-line px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        
        {/* Drift & Sequence Controls */}
        <div className="flex items-center space-x-2 overflow-x-auto py-1">
          <span className="text-xs font-heading font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">Drift Controls:</span>
          <button
            type="button"
            onClick={handleSwap}
            disabled={!nextEntry || Boolean(swapBlock)}
            title={
              swapBlock ??
              (nextEntry ? `Swap ${currentStep?.title} with ${nextEntry.step.title}` : "No next step to swap")
            }
            className={`${CONTROL_BUTTON_BASE} ${
              !nextEntry || swapBlock
                ? CONTROL_BUTTON_DISABLED
                : "bg-raised hover:bg-line border-line-strong text-slate-200"
            }`}
          >
            🔀 Swap w/ Next
          </button>
          {controlNotice ? (
            <span
              aria-live="polite"
              title={controlNotice}
              className="max-w-[240px] truncate rounded-lg border border-line-strong bg-raised px-2.5 py-1.5 text-[10px] text-slate-300"
            >
              {controlNotice}
            </span>
          ) : null}
          <span
            title="Timeline progress survives tablet lock or browser refresh"
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono whitespace-nowrap border ${savedLocally ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-amber-950/70 border-amber-800 text-amber-300'}`}
          >
            {savedLocally ? "💾 Saved locally" : "⚠️ Local save unavailable"}
          </span>
        </div>

        {/* Undo + Primary Action Button */}
        <div className="flex items-center space-x-3 ml-auto">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            title={canUndo ? `Undo: ${lastUndo?.label ?? 'last action'}` : "Nothing to undo"}
            className={`px-3 py-2.5 rounded-xl text-sm font-heading font-semibold transition border ${!canUndo ? 'bg-card text-slate-600 border-line cursor-not-allowed' : 'bg-raised hover:bg-line text-slate-200 border-line-strong'}`}
          >
            ↩ Undo
          </button>
          <HoldToConfirmButton
            onConfirm={handleAdvance}
            disabled={isComplete}
            label={isComplete ? "EVENT COMPLETE ✓" : "HOLD TO ADVANCE ➔"}
            holdLabel="hold 1.2s"
            className={`px-6 py-2.5 rounded-xl text-sm font-heading font-bold transition border ${isComplete ? 'bg-card text-slate-500 border-line' : 'bg-brand hover:bg-brand-hover active:bg-brand-active text-white shadow-lg shadow-blue-950/60 border-brand-strong'}`}
          />
        </div>

      </footer>

      {overlay === "teleprompter" && (
        <TeleprompterOverlay open step={currentStep} onClose={closeOverlay} />
      )}
      {overlay === "game" && (
        <GameClickerOverlay open game={game} onClose={closeOverlay} />
      )}
      <UndoToast
        toast={undoToast}
        onUndo={handleUndo}
        onDismiss={() => setUndoToast(null)}
      />

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
      activeSpeechId={liveState.active_speech_id}
      viewSwitch={viewSwitch}
      onUndo={handleUndo}
      canUndo={canUndo}
      lastUndoLabel={lastUndo?.label}
      onAdvance={handleAdvance}
      isComplete={isComplete}
      childrenExpected={childrenExpected}
      childrenRole={currentRole}
      allowMcChildren
    >
      {compactContent}
    </RoleShell>
  );
}
