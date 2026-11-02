import React, { useState } from 'react';
import logo from './assets/img/logo.png';
import BufferAccordionCard from './components/BufferAccordionCard';
import CulturalRulesBar from './components/CulturalRulesBar';
import DjBoothView from './components/DjBoothView';
import GameClickerOverlay from './components/GameClickerOverlay';
import PairingScreen from './components/PairingScreen';
import PocketRemoteView from './components/PocketRemoteView';
import RoleSwitcher from './components/RoleSwitcher';
import StagePingControls from './components/StagePingControls';
import SyncStatusBadge from './components/SyncStatusBadge';
import TeleprompterOverlay from './components/TeleprompterOverlay';
import VipAlertsModal from './components/VipAlertsModal';
import { useLiveStageState } from './hooks/useLiveStageState';
import { usePairing } from './hooks/usePairing';
import { useRole } from './hooks/useRole';
import { availableRoleIds } from './lib/roles';
import { buildDriftReport } from './lib/driftEngine';

const HALL_ENTRANCE_SCRIPT = {
  has_script: true,
  type: "SPEECH",
  title: "Hall Entrance, Toast & Dinner Start",
  items: [
    {
      id: "welcome",
      heading: "Welcome the couple",
      lines: [
        { lang: "PL", text: "Drodzy Państwo, prosimy o powstanie i powitanie Pary Młodej gromkimi brawami!" },
        { lang: "FR", text: "Mesdames et messieurs, veuillez vous lever et accueillir les jeunes mariés par un tonnerre d'applaudissements !" },
        { lang: "EN", text: "Ladies and gentlemen, please stand and welcome the newlyweds with a round of applause!" }
      ]
    },
    {
      id: "no-sto-lat",
      heading: "No Sto Lat tonight",
      lines: [
        { lang: "PL", text: "Uwaga: dziś wieczorem NIE śpiewamy „Sto lat”. Prosimy uszanować życzenie Pary Młodej." },
        { lang: "FR", text: "Attention : ce soir, nous ne chanterons PAS « Sto lat ». Merci de respecter le souhait des mariés." },
        { lang: "EN", text: "Please note: we will NOT sing “Sto Lat” tonight. Thank you for respecting the couple's wish." }
      ]
    },
    {
      id: "tartare",
      heading: "Steak tartare & vodka (FR explanation)",
      lines: [
        { lang: "FR", text: "En Pologne, la tradition veut que lorsqu'on mange un tartare, on se doit de boire de la vodka avec." },
        { lang: "PL", text: "W Polsce tradycja mówi, że do tatara pije się wódkę." },
        { lang: "EN", text: "In Poland, tradition says that steak tartare is served with a shot of vodka." }
      ]
    },
    {
      id: "guestbook",
      heading: "Guestbook, Instax & anniversary bottle",
      lines: [
        { lang: "EN", text: "A quick reminder: the guestbook and Instax cameras are by the entrance. Add a wish to the bottle for the couple's first anniversary!" },
        { lang: "PL", text: "Przypominamy: księga gości i aparaty Instax są przy wejściu. Wrzućcie życzenia do butelki na pierwszą rocznicę!" },
        { lang: "FR", text: "Petit rappel : le livre d'or et les appareils Instax sont à l'entrée. Ajoutez un vœu dans la bouteille pour le premier anniversaire du couple !" }
      ]
    }
  ]
};

const TEST_WIEDZY_GAME = {
  has_script: true,
  type: "GAME_QUESTIONS",
  title: "Test Wiedzy — 14 Questions",
  items: [
    { id: "q01", question: { EN: "Who arrives at the airport 4 hours before the flight?", PL: "Kto przychodzi na lotnisko 4 godziny przed odlotem?", FR: "Qui arrive à l'aéroport 4 heures avant le vol ?" }, answer: "Antoine" },
    { id: "q02", question: { EN: "Who is the boss at home?", PL: "Kto rządzi w domu?", FR: "Qui est le chef à la maison ?" }, answer: "Justyna" },
    { id: "q03", question: { EN: "Who walks Silvio the dog?", PL: "Kto wyprowadza psa Silvio?", FR: "Qui promène Silvio le chien ?" }, answer: "Antoine" },
    { id: "q04", question: { EN: "Who sent the first message?", PL: "Kto napisał pierwszą wiadomość?", FR: "Qui a envoyé le premier message ?" }, answer: "Antoine" },
    { id: "q05", question: { EN: "Who is always late?", PL: "Kto zawsze się spóźnia?", FR: "Qui est toujours en retard ?" }, answer: "Justyna" },
    { id: "q06", question: { EN: "Who is the more romantic one?", PL: "Kto jest bardziej romantyczny?", FR: "Qui est le plus romantique ?" }, answer: "Antoine" },
    { id: "q07", question: { EN: "Who owns more shoes?", PL: "Kto ma więcej butów?", FR: "Qui a le plus de chaussures ?" }, answer: "Justyna" },
    { id: "q08", question: { EN: "Who is the gadget person?", PL: "Kto jest gadżeciarzem?", FR: "Qui est fou de gadgets ?" }, answer: "Antoine" },
    { id: "q09", question: { EN: "Who is the better cook?", PL: "Kto lepiej gotuje?", FR: "Qui cuisine le mieux ?" }, answer: "Justyna" },
    { id: "q10", question: { EN: "Who is the better driver?", PL: "Kto lepiej prowadzi samochód?", FR: "Qui est le meilleur conducteur ?" }, answer: "Antoine" },
    { id: "q11", question: { EN: "Who always knows where everything is?", PL: "Kto zawsze wie, gdzie wszystko jest?", FR: "Qui sait toujours où tout se trouve ?" }, answer: "Justyna" },
    { id: "q12", question: { EN: "Who has the worst handwriting?", PL: "Kto ma najbrzydszy charakter pisma?", FR: "Qui a la plus mauvaise écriture ?" }, answer: "Antoine" },
    { id: "q13", question: { EN: "Who falls asleep first?", PL: "Kto pierwszy zasypia?", FR: "Qui s'endort en premier ?" }, answer: "Justyna" },
    { id: "q14", question: { EN: "Who is worse at maths?", PL: "Kto jest gorszy z matematyki?", FR: "Qui est le plus nul en maths ?" }, answer: "Justyna" }
  ]
};

const VIP_ALERTS = [
  {
    id: "uncle-sylwek",
    tone: "critical",
    icon: "🎸",
    tag: "Family",
    title: "Uncle Sylwek — guitar limit",
    detail: "May arrive with a guitar and ask to play. Allow MAX 1 short performance (a few minutes). Do not allow repeated concerts."
  },
  {
    id: "uncle-dawid",
    tone: "critical",
    icon: "⚠️",
    tag: "Family",
    title: "Uncle Dawid Chmielewski",
    detail: "Can become difficult to control after alcohol. If needed, discreetly alert Wojtek — he takes full responsibility for handling him."
  },
  {
    id: "birthdays",
    tone: "celebrate",
    icon: "🎂",
    tag: "Birthday",
    title: "Guest birthdays today",
    detail: "Call Melanie and Marzena to the center: “Joyeux Anniversaire” for Melanie, “Sto Lat” for Marzena. Best moment: cake."
  },
  {
    id: "blind-grandmother",
    tone: "care",
    icon: "👵",
    tag: "Care",
    title: "Blind grandmother",
    detail: "Groom's grandmother is elderly and nearly blind; groom's mother cares for her. Keep walkways clear and warn before loud moments."
  }
];

const WEDDING = {
  weddingId: "2026-08-20_jennifer_guillaume",
  couple: "Jennifer & Guillaume",
  date: "20.08.2026",
  syncPin: "2008",
  role: "MC",
  hostingMode: "HOST_AND_DJ",
  driftMinutes: 25,
  culturalRules: {
    sto_lat: { status: "STRICT_NO", note: "Inform guests: NO Sto Lat tonight!" },
    gorzko: { status: "STRICT_NO", note: "No Gorzko Gorzko" },
    bread_salt: { status: "YES", note: "Vodka vs water shot, break glasses" }
  },
  vipRadarCount: VIP_ALERTS.length,
  tact_and_vip_alerts: VIP_ALERTS,
  jokersCount: 3,
  steps: [
    { id: "step_01", time: "16:30", durationMin: 30, title: "Aperitif in Garden", type: "BUFFER", location: "Garden", buffer: { minDurationMin: 15, maxDurationMin: 45 }, dj: { playlist: "Garden Aperitif", track: "La Vie en Rose — Édith Piaf" } },
    { id: "step_02", time: "17:00", durationMin: 60, title: "Outdoor Civil Ceremony", type: "ELASTIC", location: "Garden Gazebo", dj: { playlist: "Ceremony Procession", track: "Canon in D — Pachelbel", cutoff: "18:20" } },
    { id: "step_03", time: "18:00", realStart: "18:25", planned: "18:00", durationMin: 90, title: "Hall Entrance, Toast & Dinner Start", type: "ELASTIC", location: "Main Hall", dj: { playlist: "Dinner Jazz", track: "Fly Me to the Moon — Frank Sinatra", cutoff: "20:15" }, teleprompter: HALL_ENTRANCE_SCRIPT },
    { id: "step_04", time: "19:30", durationMin: 30, title: "Buffets Open & Dance Floor", type: "BUFFER", location: "Main Hall", buffer: { minDurationMin: 10, maxDurationMin: 60, danceBlock: true }, dj: { playlist: "Dance Floor Block", track: "September — Earth, Wind & Fire" } },
    { id: "step_05", time: "20:30", durationMin: 30, title: "Cake & Sparklers", type: "HARD_ANCHOR", location: "Terrace", dj: { playlist: "Party Set", track: "Dancing Queen — ABBA", cutoff: "21:30" }, teleprompter: TEST_WIEDZY_GAME }
  ]
};

const SUBTASKS = [
  "Parents' thank-you speech + gifts (with mic)",
  "Rosół + Tartare with Vodka shot",
  "Speeches between starter and main course"
];

// Demo cartridge starting mid-evening, as it would after a couple of taps.
// `WeddingSchema v1.1` shape: `live_sync_state`.
const INITIAL_LIVE_STATE = {
  active_step_id: "step_03",
  completed_step_ids: ["step_01", "step_02"],
  actual_timestamps: { step_01: "16:31", step_02: "17:00", step_03: "18:25" },
  checked_subtasks: {
    [SUBTASKS[0]]: true,
    [SUBTASKS[1]]: false,
    [SUBTASKS[2]]: false
  }
};

const STEP_TYPE_STYLES = {
  ELASTIC: "text-white bg-[#002395] border-[#3b5bdb]",
  BUFFER: "text-cyan-200 bg-cyan-950/70 border-cyan-800",
  HARD_ANCHOR: "text-[#ffb3ba] bg-[#ED2939]/20 border-[#ED2939]/60"
};

export default function App() {
  const pairing = usePairing({ expectedPin: WEDDING.syncPin });
  const {
    liveState,
    markCurrentDone,
    undoLastStep,
    toggleSubtask,
    sendStagePing,
    savedLocally,
    syncStatus,
    syncConfigured,
    syncError,
    remoteUpdatedAt,
  } = useLiveStageState({
    steps: WEDDING.steps,
    weddingId: WEDDING.weddingId,
    roomId: pairing.pin,
    syncPin: pairing.pin,
    initialLiveState: INITIAL_LIVE_STATE
  });
  const { role, setRole } = useRole();
  const [overlay, setOverlay] = useState(null);
  const closeOverlay = () => setOverlay(null);
  const handleRoleChange = (next) => {
    setOverlay(null);
    setRole(next);
  };

  if (!pairing.isPaired) {
    return (
      <PairingScreen
        wedding={WEDDING}
        onPair={pairing.pair}
        cloudConfigured={syncConfigured}
      />
    );
  }

  const handleUnpair = () => {
    const confirmed = window.confirm(
      "Forget the room PIN on this device? Timeline progress stays saved locally."
    );
    if (confirmed) pairing.unpair();
  };

  const roleIds = availableRoleIds(WEDDING.hostingMode);
  const currentRole = roleIds.includes(role) ? role : "mc";
  const showDjCues = roleIds.includes("dj");

  const { steps } = WEDDING;
  const driftReport = buildDriftReport(steps, liveState, {
    jokerAvailable: WEDDING.jokersCount > 0,
  });
  const { entries: timeline, activeEntry: currentEntry, nextEntry } = driftReport;
  const currentStep = currentEntry?.step ?? null;
  const completedCount = driftReport.completedCount;
  const isComplete = !currentStep;
  const realStart = currentEntry?.projectedStart ?? null;
  const estimatedEnd = currentEntry?.projectedEnd ?? null;
  const drift = driftReport.currentDriftMinutes;
  const driftText = driftReport.currentDriftLabel;
  const driftClass = drift > 0
    ? "bg-[#ED2939]/20 border-[#ED2939]/60 text-[#ff6b75]"
    : drift < 0
      ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
      : "bg-[#111d3b] border-[#2b3d73] text-slate-300";
  const stepTypeClass = currentStep ? STEP_TYPE_STYLES[currentStep.type] ?? STEP_TYPE_STYLES.ELASTIC : '';
  const script = currentStep?.teleprompter?.type === "SPEECH" ? currentStep.teleprompter : null;
  const game = currentStep?.teleprompter?.type === "GAME_QUESTIONS" ? currentStep.teleprompter : null;

  const roleProps = {
    role: currentRole,
    roles: roleIds,
    onRoleChange: handleRoleChange
  };

  if (currentRole === "dj") {
    return (
      <DjBoothView
        wedding={WEDDING}
        timeline={timeline}
        projectedFinish={driftReport.projectedFinish}
        stagePing={liveState.stage_ping}
        syncStatus={syncStatus}
        syncError={syncError}
        remoteUpdatedAt={remoteUpdatedAt}
        {...roleProps}
      />
    );
  }

  if (currentRole === "pocket") {
    return (
      <>
        <PocketRemoteView
          wedding={WEDDING}
          timeline={timeline}
          onAdvance={markCurrentDone}
          onUndo={undoLastStep}
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
      </>
    );
  }

  return (
    <div className="h-screen bg-[#070b19] text-slate-100 font-body flex flex-col justify-between select-none overflow-hidden antialiased">
      
      {/* ================= TOP BAR ================= */}
      <header className="bg-[#0b132b] border-b border-[#1c2a52] px-4 py-3 flex flex-wrap items-center justify-between text-xs font-heading tracking-wide">
        <div className="flex items-center space-x-4">
          <div className="bg-white px-3 py-1.5 rounded-lg shadow-md flex items-center justify-center">
            <img 
              src={logo} 
              alt="Weselny Żabojad" 
              className="h-20 w-auto object-contain max-w-[260px]" 
            />
          </div>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="bg-[#111d3b] px-3 py-1.5 rounded text-white font-mono font-semibold border border-[#2b3d73] text-sm">{realStart ?? "—"}</span>
          {driftText ? (
            <span className={`px-3 py-1.5 rounded font-semibold text-sm border ${driftClass}`}>{driftText}</span>
          ) : null}
          <span className="text-slate-300 font-medium hidden md:inline">Wedding: <strong className="text-white">{WEDDING.couple}</strong></span>
        </div>

        <div className="flex flex-wrap items-center gap-2 my-2 sm:my-0">
          <CulturalRulesBar rules={WEDDING.culturalRules} />
          <button
            type="button"
            onClick={() => setOverlay("vip")}
            title="Open confidential VIP & tactful family alerts"
            className="bg-[#ED2939]/20 border border-[#ED2939]/60 text-[#ff808a] px-2.5 py-1 rounded font-semibold cursor-pointer hover:bg-[#ED2939]/30 active:bg-[#ED2939]/40 transition"
          >
            🚨 VIP Radar ({WEDDING.tact_and_vip_alerts.length})
          </button>
          <span className="bg-[#002395]/40 border border-[#3b5bdb] text-[#849dff] px-2.5 py-1 rounded cursor-pointer hover:bg-[#002395]/60 transition">🃏 Jokers ({WEDDING.jokersCount})</span>
        </div>

        <div className="flex items-center space-x-3 font-mono">
          <button
            type="button"
            onClick={handleUnpair}
            title="Paired room PIN — click to forget this device"
            className="text-slate-400 hover:text-white transition"
          >
            PIN: <strong className="text-white">{pairing.pin}</strong>
            <span className="ml-1 text-[10px]">🔓</span>
          </button>
          <span className="text-slate-500">•</span>
          <SyncStatusBadge status={syncStatus} error={syncError} remoteUpdatedAt={remoteUpdatedAt} />
          <RoleSwitcher role={currentRole} roles={roleIds} onChange={handleRoleChange} />
        </div>
      </header>

      {/* ================= MAIN DASHBOARD (70% / 30% SPLIT) ================= */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-10 gap-4 p-4 overflow-y-auto">
        
        {/* ACTIVE STEP (70% Width -> 7 cols on lg) */}
        <section className="lg:col-span-7 bg-[#0b132b]/95 border border-[#1c2a52] rounded-xl p-4 flex flex-col justify-between shadow-xl relative">
          {currentStep ? (
            <div className="flex-1 min-h-0 flex flex-col justify-between">
              <div>
                {/* Step Header & Timing */}
                <div className="flex items-center justify-between border-b border-[#1c2a52] pb-2.5 mb-3">
                  <div>
                    <span className={`text-xs uppercase tracking-wider font-heading font-semibold px-2.5 py-1 rounded border ${stepTypeClass}`}>
                      {currentStep.type.replace("_", " ")} STEP
                    </span>
                    <h1 className="text-2xl font-heading font-bold text-white mt-2">{currentStep.title}</h1>
                    <div className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
                      <span>📍 Location: <strong className="text-slate-200">{currentStep.location}</strong></span>
                    </div>
                  </div>
                  <div className="text-right bg-[#070b19]/80 p-3 rounded-lg border border-[#1c2a52]">
                    <div className="text-xs text-slate-400">Planned: <span className="line-through text-slate-500">{currentStep.planned || currentStep.time}</span></div>
                    <div className="text-sm font-mono text-white font-semibold mt-0.5">Real Start: {realStart}</div>
                    <div className="text-xs text-slate-300 mt-0.5">Est. End: {estimatedEnd ?? "—"}</div>
                  </div>
                </div>

                <div className={`grid grid-cols-1 gap-4 my-3 ${showDjCues ? "md:grid-cols-2" : ""}`}>
                  {/* MC Cues */}
                  <div className="bg-[#070b19]/60 p-3.5 rounded-lg border border-[#1c2a52]">
                    <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ED2939]"></span>
                      <span>🗣️ MC Cues (FR / PL / EN)</span>
                    </h3>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start space-x-2">
                        <span className="text-[#849dff] font-mono text-xs mt-0.5">[FR/PL]</span>
                        <span>Inform guests: NO Sto Lat tonight!</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-[#849dff] font-mono text-xs mt-0.5">[FR]</span>
                        <span>Explain Polish Steak Tartare + Vodka tradition.</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-[#849dff] font-mono text-xs mt-0.5">[ALL]</span>
                        <span>Announce Instax + Guestbook + 1st Anniv Bottle.</span>
                      </li>
                    </ul>
                  </div>

                  {/* DJ / Audio Cues (hidden in HOST_ONLY mode) */}
                  {showDjCues && (
                    <div className="bg-[#070b19]/60 p-3.5 rounded-lg border border-[#1c2a52]">
                      <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#002395]"></span>
                        <span>🎧 DJ / Audio Cues</span>
                      </h3>
                      <ul className="space-y-2 text-sm text-slate-300">
                        <li className="flex items-start space-x-2">
                          <span className="text-cyan-400 font-mono text-xs mt-0.5">🎵</span>
                          <span>{currentStep.dj?.playlist ?? "Background dinner music"} ({currentStep.dj?.track ?? "playlist active"}).</span>
                        </li>
                        <li className="text-xs text-slate-400 bg-[#0b132b] p-2 rounded border border-[#1c2a52] mt-2">
                          ⚡ Remote Stage Ping Ready: <span className="text-white font-mono">Synced to DJ Booth View</span>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Catering & Sub-Tasks */}
                <div className="mt-4 bg-[#070b19]/70 p-3.5 rounded-lg border border-[#1c2a52]">
                  <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider mb-2">📋 Catering & Sub-Tasks (Tap to check off)</h3>
                  <div className="space-y-2">
                    {SUBTASKS.map((task) => {
                      const checked = Boolean(liveState.checked_subtasks[task]);
                      return (
                        <div 
                          key={task} 
                          onClick={() => toggleSubtask(task)}
                          className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition ${checked ? 'bg-[#002395]/30 border border-[#002395]/60 text-slate-200' : 'bg-[#0b132b] border border-[#1c2a52] text-slate-300 hover:border-[#2b3d73]'}`}
                        >
                          <input 
                            type="checkbox" 
                            checked={checked} 
                            onChange={() => {}} 
                            className="w-4 h-4 rounded text-[#002395] bg-[#070b19] border-slate-700 focus:ring-[#002395]"
                          />
                          <span className={`text-sm ${checked ? 'line-through text-slate-400' : ''}`}>{task}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Launch overlays for the active step */}
              <div className="mt-4 pt-3 border-t border-[#1c2a52] flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {script && (
                    <button
                      type="button"
                      onClick={() => setOverlay("teleprompter")}
                      className="bg-[#111d3b] hover:bg-[#1c2a52] text-slate-200 px-4 py-2 rounded-lg text-xs font-heading font-semibold transition border border-[#2b3d73]"
                    >
                      📖 Open Teleprompter / Script
                    </button>
                  )}
                  {game && (
                    <button
                      type="button"
                      onClick={() => setOverlay("game")}
                      className="bg-[#002395]/40 hover:bg-[#002395]/70 text-white px-4 py-2 rounded-lg text-xs font-heading font-semibold transition border border-[#3b5bdb]"
                    >
                      🎮 Game Clicker ({game.items.length} Qs)
                    </button>
                  )}
                  {!script && !game && (
                    <span className="text-xs text-slate-500 font-mono">No script attached to this step.</span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono">Step {currentEntry.index + 1} of {steps.length}</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <div className="text-5xl mb-3">🎉</div>
              <span className="text-xs uppercase tracking-widest text-emerald-300 font-heading font-semibold">Event complete</span>
              <h1 className="text-2xl font-heading font-bold text-white mt-2">All {steps.length} steps marked done</h1>
              <p className="text-sm text-slate-400 mt-2 max-w-md">
                Progress is saved on this device. Use Undo in the footer if you advanced by mistake.
              </p>
              <div className="mt-4 text-xs font-mono text-slate-400">{completedCount} / {steps.length} completed</div>
            </div>
          )}
        </section>

        {/* PEEK NEXT & HARD ANCHOR RADAR (30% Width -> 3 cols on lg) */}
        <section className="lg:col-span-3 flex flex-col space-y-4">
          
          {/* Peek Next */}
          <div className="bg-[#0b132b]/95 border border-[#1c2a52] rounded-xl p-4 shadow-lg">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-heading font-semibold">PEEK NEXT</span>
            {nextEntry ? (
              <>
                <div className="text-lg font-heading font-bold text-white mt-1">{nextEntry.step.title}</div>
                <div className="text-xs font-mono mt-1">
                  <span className="text-slate-500 line-through">{nextEntry.plannedStart}</span>
                  <span className="mx-1 text-slate-500">→</span>
                  <span className="text-white">{nextEntry.projectedStart}</span>
                  {nextEntry.projectedDriftMinutes ? (
                    <span
                      className={`ml-2 font-semibold ${
                        nextEntry.projectedDriftMinutes > 0 ? 'text-[#ff808a]' : 'text-emerald-300'
                      }`}
                    >
                      {nextEntry.driftLabel}
                    </span>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400 mt-1">No further steps — event complete.</div>
            )}
          </div>

          <BufferAccordionCard accordion={driftReport.bufferAccordion} />

          {/* Hard Anchor Radar */}
          <div className="bg-[#0b132b]/95 border border-[#ED2939]/40 rounded-xl p-4 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#ED2939] text-white px-2 py-0.5 text-[10px] font-mono rounded-bl font-bold">
              LOCK RADAR
            </div>
            <h3 className="text-xs font-heading font-bold text-[#ff808a] uppercase tracking-wider mb-2">🚨 Hard Anchor Radar</h3>
            <div className="space-y-2 text-xs">
              <div className="bg-[#070b19] p-2.5 rounded border border-[#1c2a52] flex justify-between items-center">
                <span>📸 Photo/Video Leaves</span>
                <span className="font-mono text-[#ff808a] font-semibold">00:00 (in 5h 35m)</span>
              </div>
              <div className="bg-[#070b19] p-2.5 rounded border border-[#1c2a52] flex justify-between items-center">
                <span>🎂 Oczepiny (Exact)</span>
                <span className="font-mono text-white font-semibold">00:00</span>
              </div>
            </div>
          </div>

          {/* Silent Stage Pings to DJ (hidden in HOST_ONLY mode) */}
          {showDjCues && (
            <StagePingControls
              onSend={sendStagePing}
              lastPing={liveState.stage_ping}
              syncStatus={syncStatus}
            />
          )}

        </section>

      </main>

      {/* ================= BOTTOM BAR (DRIFT CONTROLS & PRIMARY ACTION) ================= */}
      <footer className="bg-[#0b132b] border-t border-[#1c2a52] px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        
        {/* Drift & Sequence Controls */}
        <div className="flex items-center space-x-2 overflow-x-auto py-1">
          <span className="text-xs font-heading font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">Drift Controls:</span>
          <button className="bg-[#111d3b] hover:bg-[#1c2a52] border border-[#2b3d73] text-white px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap shadow">
            ⏱️ Kitchen / Vendor +15m
          </button>
          <button className="bg-[#111d3b] hover:bg-[#1c2a52] border border-[#2b3d73] text-slate-200 px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap shadow">
            🔀 Swap w/ Next
          </button>
          <button className="bg-[#111d3b] hover:bg-[#1c2a52] border border-[#2b3d73] text-[#849dff] px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap shadow">
            🃏 Defer to Joker Drawer
          </button>
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
            onClick={undoLastStep}
            disabled={completedCount === 0}
            title="Undo last completed step"
            className={`px-3 py-2.5 rounded-xl text-sm font-heading font-semibold transition border ${completedCount === 0 ? 'bg-[#0b132b] text-slate-600 border-[#1c2a52] cursor-not-allowed' : 'bg-[#111d3b] hover:bg-[#1c2a52] text-slate-200 border-[#2b3d73]'}`}
          >
            ↩ Undo
          </button>
          <button 
            type="button"
            onClick={markCurrentDone}
            disabled={isComplete}
            className={`px-6 py-2.5 rounded-xl text-sm font-heading font-bold transition flex items-center space-x-2 border ${isComplete ? 'bg-[#0b132b] text-slate-500 border-[#1c2a52] cursor-not-allowed' : 'bg-[#002395] hover:bg-[#1a3cb0] active:bg-[#00186b] text-white shadow-lg shadow-blue-950/60 border-[#3b5bdb]'}`}
          >
            <span>{isComplete ? "EVENT COMPLETE" : "MARK DONE & ADVANCE"}</span>
            <span className="text-lg">{isComplete ? "✓" : "➔"}</span>
          </button>
        </div>

      </footer>

      {overlay === "teleprompter" && (
        <TeleprompterOverlay open step={currentStep} onClose={closeOverlay} />
      )}
      {overlay === "game" && (
        <GameClickerOverlay open game={game} onClose={closeOverlay} />
      )}
      {overlay === "vip" && (
        <VipAlertsModal open alerts={WEDDING.tact_and_vip_alerts} onClose={closeOverlay} />
      )}

    </div>
  );
}
