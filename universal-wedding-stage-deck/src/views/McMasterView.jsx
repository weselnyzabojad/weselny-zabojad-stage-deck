// MC master view (project.md TODO 22).
//
// Extracted from the former App.jsx god component as a pure refactor. All state,
// live-sync effects and handlers stay in App.jsx; this file is the presentation
// layer for the MC role. The `model` object carries the already-derived values
// and callbacks so there is exactly one place to wire a future routed shell.

import logo from '../assets/img/logo.png';
import CakeCard from '../components/CakeCard';
import AttractionStrip from '../components/AttractionStrip';
import ChildrenExpectedBadge from '../components/ChildrenExpectedBadge';
import GrandEntranceCueCard from '../components/GrandEntranceCueCard';
import FirstDanceCueCard from '../components/FirstDanceCueCard';
import GamesCueCard from '../components/GamesCueCard';
import CulturalRulesBar from '../components/CulturalRulesBar';
import CurrentStepOverflow from '../components/CurrentStepOverflow';
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
import { useI18n } from '../i18n/useI18n';
import useCompact from '../hooks/useCompact';
import { mapMandatoryToSteps } from '../lib/mandatorySteps.js';
import { resolveEventDateISO, resolveVenueTimeZone } from '../lib/eventTime.js';
import { resolveOczepinyIndicator } from '../lib/oczepinyIndicator';
import { resolveGroupPhotoStepId, resolvePhotoPlan } from '../lib/photoPlan.js';
import { orderSubtasks } from '../lib/subtasks.js';

function childrenWarningFor(step) {
  const title = String(step?.title ?? '').toLowerCase();
  if (/wedding cake|cake cutting/.test(title)) {
    return 'mc.step.childrenCake';
  }
  if (/grand entrance/.test(title)) {
    return 'mc.step.childrenEntrance';
  }
  if (/first dance/.test(title)) {
    return 'mc.step.childrenDancefloor';
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
  setGameResults,
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

  const { t } = useI18n();

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
  const isGameStep = Boolean(
    currentStep &&
      (currentStep.optionalFlag === 'games' || /games/i.test(currentStep.title)),
  );
  const isCakeStep = Boolean(
    currentStep && cakeProtocol?.stepId && currentStep.id === cakeProtocol.stepId,
  );
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

  const isCompact = useCompact();

  const railEntries = driftReport.entries ?? [];
  const railActiveIndex = railEntries.findIndex((entry) => entry.isActive);

  // Compact (phone) content: the same shared focus stack as the desktop rail,
  // plus the MC-only advance/undo controls inside the current card.
  const compactCurrentBody = currentStep ? (
    <div className="flex flex-col gap-2">
      <span
        className={`w-fit rounded border px-2.5 py-1 font-heading text-xs font-semibold uppercase tracking-wider ${stepTypeClass}`}
      >
        {t('mc.step.type', { type: currentStep.type.replace('_', ' ') })}
      </span>
      <div className="flex items-center justify-between rounded-lg border border-line bg-page/80 p-2 text-xs font-mono">
        <span>{t('mc.step.realStart')}: <strong className="text-ink">{realStart}</strong></span>
        <span>{t('mc.step.estimatedEnd')}: <strong className="text-ink">{estimatedEnd ?? '—'}</strong></span>
      </div>
      {currentStep.grandEntranceOrder ? <GrandEntranceCueCard step={currentStep} /> : null}
      {currentStep.firstDanceMode ? (
        <FirstDanceCueCard step={currentStep} audience="mc" />
      ) : null}
      {isGameStep ? (
        <GamesCueCard wedding={WEDDING} role="mc" gameId={currentStep.gameId ?? null} />
      ) : null}
      {isCakeStep ? (
        <CakeCard cake={cakeProtocol} cakeServiceMode={cakeServiceMode} compact />
      ) : null}
      {isCakeStep ? null : <StepMandatoryNotes items={mandatoryItems} />}
      {groupPhotoBody}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleUndo}
          disabled={!canUndo}
          className={`min-h-12 px-3 py-2 rounded-lg text-sm font-semibold border ${!canUndo ? 'bg-card text-muted border-line cursor-not-allowed' : 'bg-raised hover:bg-line text-ink border-line-strong'}`}
        >
          ↩ {t('mc.step.undo')}
        </button>
        <HoldToConfirmButton
          onConfirm={handleAdvance}
          disabled={isComplete}
          label={isComplete ? t('mc.step.eventComplete') : t('mc.step.holdAdvance')}
          holdLabel={t('mc.step.holdHint')}
          className={`min-h-12 flex-1 px-4 py-2 rounded-lg text-sm font-bold border ${isComplete ? 'bg-card text-muted border-line' : 'bg-brand hover:bg-brand-hover active:bg-brand-active text-on-accent border-brand-strong'}`}
        />
      </div>
      <CurrentStepOverflow
        onSwap={handleSwap}
        swapBlock={swapBlock}
        nextEntry={nextEntry}
        currentStep={currentStep}
      />
      {script ? (
        <button
          type="button"
          onClick={() => setOverlay('teleprompter')}
          className="w-full bg-raised hover:bg-line text-ink px-3 py-2 rounded-lg text-xs font-semibold border border-line-strong"
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
      {driftReport.hardAnchorRadar.hasWarning ? (
        <HardAnchorAlertBanner radar={driftReport.hardAnchorRadar} childrenExpected={childrenExpected} />
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
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>
            {t('mc.step.planned')}:{' '}
            <span className="line-through text-muted">
              {currentStep.planned || currentStep.time}
            </span>
          </span>
          <span className="text-muted">·</span>
          <span>
            {t('mc.step.realStart')}: <span className="font-mono text-ink">{realStart}</span>
          </span>
          <span className="text-muted">·</span>
          <span>
            {t('mc.step.estimatedEnd')}: <span className="font-mono text-ink">{estimatedEnd ?? '—'}</span>
          </span>
        </div>
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

      <div className="grid grid-cols-1 gap-3">
        {/* MC Cues */}
        <div className="bg-page/60 p-3 rounded-lg border border-line">
          <h3 className="text-xs font-heading font-bold text-ink uppercase tracking-wider mb-2 flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-alert"></span>
            <span>🗣️ {t('mc.step.cuesTitle')}</span>
          </h3>
          <ul className="space-y-2 text-sm text-ink">
            {childrenExpected && childrenWarningFor(currentStep) ? (
              <li className="flex items-start space-x-2 rounded border border-amber-700/60 bg-amber-950/40 p-2 text-amber-100">
                <span aria-hidden="true" className="mt-0.5 text-sm">⚠️</span>
                <span>{t(childrenWarningFor(currentStep))}</span>
              </li>
            ) : null}
            <li className="flex items-start space-x-2 text-muted">
              <span>{t('mc.cues.empty')}</span>
            </li>
          </ul>
        </div>
      </div>

      {currentStep.grandEntranceOrder ? <GrandEntranceCueCard step={currentStep} /> : null}
      {currentStep.firstDanceMode ? (
        <FirstDanceCueCard step={currentStep} audience="mc" />
      ) : null}
      {isGameStep ? (
        <GamesCueCard wedding={WEDDING} role="mc" gameId={currentStep.gameId ?? null} />
      ) : null}

      {isCakeStep ? (
        <CakeCard cake={cakeProtocol} cakeServiceMode={cakeServiceMode} />
      ) : null}

      {currentStep.optionalFlag === 'oczepiny' || /oczepiny/i.test(currentStep.title) ? (
        <OczepinyCueCard wedding={WEDDING} audience="mc" />
      ) : null}

      {isCakeStep ? null : <StepMandatoryNotes items={mandatoryItems} />}
      {groupPhotoBody}

      {stepSubtasks.length > 0 ? (
        <div className="bg-page/70 p-3 rounded-lg border border-line">
          <h3 className="text-xs font-heading font-bold text-ink uppercase tracking-wider mb-2">
            📋 {t('mc.step.subtasksTitle')}
          </h3>
          <div className="space-y-2">
            {orderSubtasks(stepSubtasks, liveState.checked_subtasks).map((task) => {
              const checked = Boolean(liveState.checked_subtasks[task]);
              return (
                <label
                  key={task}
                  className={`flex min-h-11 items-center space-x-3 p-2 rounded cursor-pointer transition focus-within:ring-2 focus-within:ring-brand-soft focus-within:ring-offset-2 focus-within:ring-offset-page ${checked ? 'bg-brand/20 border border-brand/40 text-muted' : 'bg-card border border-line text-ink hover:border-line-strong'}`}
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

      <CurrentStepOverflow
        onSwap={handleSwap}
        swapBlock={swapBlock}
        nextEntry={nextEntry}
        currentStep={currentStep}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {script && (
            <button
              type="button"
              onClick={() => setOverlay('teleprompter')}
              className="bg-raised hover:bg-line text-ink px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition border border-line-strong"
            >
              📖 {t('mc.step.openTeleprompter')}
            </button>
          )}
          {isGameStep && game && (
            <button
              type="button"
              onClick={() => setOverlay('game')}
              className="bg-brand/40 hover:bg-brand/70 text-ink px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition border border-brand-strong"
            >
              🎮 {t('mc.step.gameClicker', { count: game.items.length })}
            </button>
          )}
          {!script && !game && (
            <span className="text-xs text-muted font-mono">{t('mc.step.noScript')}</span>
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
      className="inline-flex min-h-11 items-center text-muted hover:text-ink transition"
    >
      {IS_PRODUCTION ? (
        <>
          ROLE: <strong className="text-ink">{roleSession.role.toUpperCase()}</strong>
          <span className="ml-1 text-sm">🔐</span>
        </>
      ) : (
        <>
          PIN: <strong className="text-ink">{pairing.pin}</strong>
          <span className="ml-1 text-sm">🔓</span>
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
      <div className="h-dvh bg-page text-ink font-body flex flex-col justify-between overflow-hidden antialiased">
      
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
            <span className="text-muted hidden sm:inline">|</span>
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
            inline
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
      {overlay === "game" && isGameStep && (
        <GameClickerOverlay
          open
          game={game}
          weddingId={WEDDING.weddingId}
          results={currentStep?.gameId ? liveState?.game_results?.[currentStep.gameId] ?? null : null}
          onResultsChange={setGameResults}
          onClose={closeOverlay}
        />
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
    >
      {compactContent}
    </RoleShell>
  );
}
