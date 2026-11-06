// MC master view (project.md TODO 22).
//
// Extracted from the former App.jsx god component as a pure refactor. All state,
// live-sync effects and handlers stay in App.jsx; this file is the presentation
// layer for the MC role. The `model` object carries the already-derived values
// and callbacks so there is exactly one place to wire a future routed shell.

import { useEffect, useState } from 'react';
import logo from '../assets/img/logo.png';
import BufferAccordionCard from '../components/BufferAccordionCard';
import CakeCard from '../components/CakeCard';
import CartridgeImporter from '../components/CartridgeImporter';
import ContactsModal from '../components/ContactsModal';
import CoupleIdentity from '../components/CoupleIdentity';
import CulturalRulesBar from '../components/CulturalRulesBar';
import DriftPill from '../components/DriftPill';
import EventAdminCard from '../components/EventAdminCard';
import GameClickerOverlay from '../components/GameClickerOverlay';
import HardAnchorAlertBanner from '../components/HardAnchorAlertBanner';
import HardAnchorRadar from '../components/HardAnchorRadar';
import HoldToConfirmButton from '../components/HoldToConfirmButton';
import MusicPolicyCard from '../components/MusicPolicyCard';
import PreWeddingChecklistCard from '../components/PreWeddingChecklistCard';
import ReelClock from '../components/ReelClock';
import RoleShell from '../components/RoleShell';
import RoleSwitcher from '../components/RoleSwitcher';
import StageRail from '../components/StageRail';
import { buildStageRail } from '../lib/stageRail.js';
import { resolveOczepinyIndicator } from '../lib/oczepinyIndicator';
import SpeechesCard from '../components/SpeechesCard';
import StagePingControls from '../components/StagePingControls';
import SyncStatusBadge from '../components/SyncStatusBadge';
import TeleprompterOverlay from '../components/TeleprompterOverlay';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';
import SkipLink from '../components/SkipLink';
import UndoToast from '../components/UndoToast';
import VipAlertsModal from '../components/VipAlertsModal';
import { CONTROL_BUTTON_BASE, CONTROL_BUTTON_DISABLED } from '../lib/styleConstants';

export default function McMasterView({ model }) {
  const {
  WEDDING,
  realStart,
  driftReport,
  vipAlerts,
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
  outbox,
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
  sensitiveNotes,
  handleWipeEvent,
  speechMode,
  speeches,
  selectSpeech,
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
  importerOpen,
  contactsOpen,
  handleOpenAnchor,
} = model;

  const oczepinyStatus = resolveOczepinyIndicator({
    wedding: WEDDING,
    now: driftReport?.clock?.now ?? null,
    eventDateISO: WEDDING?.dateISO ?? null,
    timeZone: driftReport?.clock?.timeZone ?? null,
  });

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

  // Compact (phone) content: drift check + advance/undo + next peek + summaries.
  const compactContent = (
    <div id="main-content" tabIndex={-1} className="space-y-4">
      {driftReport.hardAnchorRadar.hasWarning ? (
        <HardAnchorAlertBanner radar={driftReport.hardAnchorRadar} />
      ) : null}

      <ReelClock clock={driftReport.clock} />
      <DriftPill drift={driftReport.drift} />

      {currentStep ? (
        <div className="bg-card/95 border border-line rounded-xl p-4 shadow-xl">
          <span className={`text-xs uppercase tracking-wider font-heading font-semibold px-2.5 py-1 rounded border ${stepTypeClass}`}>
            {currentStep.type.replace('_', ' ')} STEP
          </span>
          <h1 className="text-lg font-heading font-bold text-white mt-2">{currentStep.title}</h1>
          <div className="text-xs text-slate-400 mt-1">
            📍 <strong className="text-slate-200">{currentStep.location}</strong>
          </div>
          <div className="mt-2 flex items-center justify-between bg-page/80 p-2 rounded-lg border border-line text-xs font-mono">
            <span>Real start: <strong className="text-white">{realStart}</strong></span>
            <span>Est. end: <strong className="text-white">{estimatedEnd ?? '—'}</strong></span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
              className="mt-2 w-full bg-raised hover:bg-line text-slate-200 px-3 py-2 rounded-lg text-xs font-semibold border border-line-strong"
            >
              📖 Open teleprompter / script
            </button>
          ) : null}
          <div className="mt-2 text-xs text-slate-400 font-mono">Step {currentEntry.index + 1} of {steps.length}</div>
        </div>
      ) : (
        <div className="bg-card/95 border border-line rounded-xl p-4 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-xs uppercase tracking-widest text-emerald-300 font-semibold">Event complete</div>
          <div className="text-sm text-slate-400 mt-1">{completedCount} / {steps.length} completed</div>
        </div>
      )}

      <div className="bg-card/95 border border-line rounded-xl p-4 shadow-lg">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">PEEK NEXT</span>
        {nextEntry ? (
          <>
            <div className="text-base font-heading font-bold text-white mt-1">{nextEntry.step.title}</div>
            <div className="text-xs font-mono mt-1">
              <span className="text-slate-500 line-through">{nextEntry.plannedStart}</span>
              <span className="mx-1 text-slate-500">→</span>
              <span className="text-white">{nextEntry.projectedStart}</span>
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-400 mt-1">No further steps — event complete.</div>
        )}
      </div>

      <CakeCard cake={cakeProtocol} />
      <MusicPolicyCard policy={musicPolicy} compact />
      <HardAnchorRadar radar={driftReport.hardAnchorRadar} />
    </div>
  );

  const railEntries = driftReport.entries ?? [];
  const railActiveIndex = railEntries.findIndex((entry) => entry.isActive);
  const stageRail = buildStageRail(railEntries, railActiveIndex);

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
          Step {currentEntry.index + 1} of {steps.length}
        </span>
      </div>

      <div className={`grid grid-cols-1 gap-3 ${showDjCues ? 'md:grid-cols-2' : ''}`}>
        {/* MC Cues */}
        <div className="bg-page/60 p-3 rounded-lg border border-line">
          <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-alert"></span>
            <span>🗣️ MC Cues (FR / PL / EN)</span>
          </h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start space-x-2">
              <span className="text-brand-soft font-mono text-xs mt-0.5">[FR/PL]</span>
              <span>Inform guests: NO Sto Lat tonight!</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-brand-soft font-mono text-xs mt-0.5">[FR]</span>
              <span>Explain Polish Steak Tartare + Vodka tradition.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-brand-soft font-mono text-xs mt-0.5">[ALL]</span>
              <span>Announce Instax + Guestbook + 1st Anniv Bottle.</span>
            </li>
          </ul>
        </div>

        {/* DJ / Audio Cues (hidden in HOST_ONLY mode) */}
        {showDjCues && (
          <div className="bg-page/60 p-3 rounded-lg border border-line">
            <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
              <span>🎧 DJ / Audio Cues</span>
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start space-x-2">
                <span className="text-cyan-400 font-mono text-xs mt-0.5">🎵</span>
                <span>{currentStep.dj?.playlist ?? 'Background dinner music'} ({currentStep.dj?.track ?? 'playlist active'}).</span>
              </li>
              <li className="text-xs text-slate-400 bg-card p-2 rounded border border-line mt-2">
                ⚡ Remote Stage Ping Ready: <span className="text-white font-mono">Synced to DJ Booth View</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {stepSubtasks.length > 0 ? (
        <div className="bg-page/70 p-3 rounded-lg border border-line">
          <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider mb-2">📋 Catering & Sub-Tasks</h3>
          <div className="space-y-2">
            {stepSubtasks.map((task) => {
              const checked = Boolean(liveState.checked_subtasks[task]);
              return (
                <label
                  key={task}
                  className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition focus-within:ring-2 focus-within:ring-brand-soft focus-within:ring-offset-2 focus-within:ring-offset-page ${checked ? 'bg-brand/30 border border-brand/60 text-slate-200' : 'bg-card border border-line text-slate-300 hover:border-line-strong'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSubtask(task)}
                    className="w-4 h-4 shrink-0 rounded bg-page border-slate-700 focus:ring-brand"
                  />
                  <span className={`text-sm ${checked ? 'line-through text-slate-400' : ''}`}>{task}</span>
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

  const wideContent = (
    <>
      <SkipLink />
      <div className="h-screen bg-page text-slate-100 font-body flex flex-col justify-between select-none overflow-hidden antialiased">
      
      {/* ================= TOP BAR ================= */}
      <header className="bg-card border-b border-line px-4 py-3 flex flex-wrap items-center justify-between text-xs font-heading tracking-wide">
        <div className="flex items-center space-x-4">
          <div className="bg-white px-3 py-1.5 rounded-lg shadow-md flex items-center justify-center">
            <img 
              src={logo} 
              alt="Weselny Żabojad" 
              className="h-20 w-auto object-contain max-w-[260px]" 
            />
          </div>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <ReelClock clock={driftReport.clock} compact />
          <DriftPill drift={driftReport.drift} />
          <CoupleIdentity wedding={WEDDING} className="text-xs" />
        </div>

        <div className="flex flex-wrap items-center gap-2 my-2 sm:my-0">
          <CulturalRulesBar
            rules={WEDDING.culturalRules}
            oczepinyStatus={oczepinyStatus}
          />
          <button
            type="button"
            onClick={() => setOverlay("vip")}
            title="Open confidential VIP & tactful family alerts"
            className="bg-alert/20 border border-alert/60 text-alert-soft px-2.5 py-1 rounded font-semibold cursor-pointer hover:bg-alert/30 active:bg-alert/40 transition"
          >
            🚨 VIP Radar ({vipAlerts.length})
          </button>
          <button
            type="button"
            onClick={() => setImporterOpen(true)}
            title="Import a WeddingSchema v1.1 cartridge"
            className="rounded border border-line-strong bg-raised px-2.5 py-1 font-semibold text-slate-200 transition hover:bg-line"
          >
          </button>
          <button
            type="button"
            onClick={() => setContactsOpen(true)}
            title="Open the vendor contacts directory"
            className="rounded border border-line-strong bg-raised px-2.5 py-1 font-semibold text-slate-200 transition hover:bg-line"
          >
            📇 Contacts ({contacts.length})
          </button>
        </div>

        <div className="flex items-center space-x-3 font-mono">
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
          <span className="text-slate-500">•</span>
          <SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} outbox={outbox} />
          {roleIds.length > 1 ? (
            <RoleSwitcher role={currentRole} roles={roleIds} onChange={handleRoleChange} />
          ) : null}
          <LanguageToggle />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {driftReport.hardAnchorRadar.hasWarning ? (
        <HardAnchorAlertBanner radar={driftReport.hardAnchorRadar} />
      ) : null}

      {/* ================= STAGE RAIL + DETAILS ================= */}
      <main id="main-content" tabIndex={-1} className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          <StageRail
            done={stageRail.done}
            current={stageRail.current}
            upcoming={stageRail.upcoming}
            currentBody={heroBody}
          />

          <section
            aria-label="Stage details"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            <ReelClock clock={driftReport.clock} />

            <CakeCard cake={cakeProtocol} />

            <MusicPolicyCard policy={musicPolicy} compact />

            <BufferAccordionCard accordion={driftReport.bufferAccordion} />

            <PreWeddingChecklistCard
              tasks={WEDDING.preWeddingTodos ?? []}
              checked={liveState.checked_subtasks}
              onToggle={toggleSubtask}
            />

            <EventAdminCard
              wedding={WEDDING}
              isProduction={IS_PRODUCTION}
              hostKey={sensitiveNotes.hostKey}
              sensitiveStatus={sensitiveNotes.status}
              onWipe={handleWipeEvent}
            />

            <SpeechesCard
              wedding={WEDDING}
              mode={speechMode}
              speeches={speeches}
              activeSpeechId={liveState.active_speech_id}
              onSelect={selectSpeech}
              clock={driftReport.clock}
            />

            <HardAnchorRadar radar={driftReport.hardAnchorRadar} />

            {/* Silent Stage Pings to DJ (hidden in HOST_ONLY mode) */}
            {showDjCues && (
              <StagePingControls
                onSend={sendStagePing}
                lastPing={liveState.stage_ping}
                syncStatus={syncStatus}
              />
            )}
          </section>
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
      {overlay === "vip" && (
        <VipAlertsModal open alerts={vipAlerts} onClose={closeOverlay} />
      )}

      <UndoToast
        toast={undoToast}
        onUndo={handleUndo}
        onDismiss={() => setUndoToast(null)}
      />

      </div>

      <CartridgeImporter
        key={importerOpen ? 'importer-open' : 'importer-closed'}
        open={importerOpen}
        onClose={() => setImporterOpen(false)}
        currentCartridge={WEDDING}
      />

      <ContactsModal
        open={contactsOpen}
        onClose={() => setContactsOpen(false)}
        contacts={contacts}
        onOpenAnchor={handleOpenAnchor}
      />
    </>
  );

  if (!isCompact) {
    return wideContent;
  }

  return (
    <RoleShell
      compact
      role={currentRole}
      roles={roleIds}
      syncStatus={syncStatus}
      syncError={syncError}
      remoteUpdatedAt={remoteUpdatedAt}
      outbox={outbox}
      onToggleTheme={toggleTheme}
      theme={theme}
      onRoleChange={handleRoleChange}
      onUndo={handleUndo}
      canUndo={canUndo}
      lastUndoLabel={lastUndo?.label}
      onAdvance={handleAdvance}
      isComplete={isComplete}
    >
      {compactContent}
    </RoleShell>
  );
}
