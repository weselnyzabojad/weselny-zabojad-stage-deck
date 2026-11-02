import React from 'react';
import logo from './assets/img/logo.png';
import CulturalRulesBar from './components/CulturalRulesBar';
import { useLiveStageState } from './hooks/useLiveStageState';
import { addMinutesToClock } from './lib/liveStageState';

const WEDDING = {
  weddingId: "2026-08-20_jennifer_guillaume",
  couple: "Jennifer & Guillaume",
  date: "20.08.2026",
  syncPin: "2008",
  role: "MC",
  driftMinutes: 25,
  culturalRules: {
    sto_lat: { status: "STRICT_NO", note: "Inform guests: NO Sto Lat tonight!" },
    gorzko: { status: "STRICT_NO", note: "No Gorzko Gorzko" },
    bread_salt: { status: "YES", note: "Vodka vs water shot, break glasses" }
  },
  vipRadarCount: 4,
  jokersCount: 3,
  steps: [
    { id: "step_01", time: "16:30", durationMin: 30, title: "Aperitif in Garden", type: "BUFFER", location: "Garden" },
    { id: "step_02", time: "17:00", durationMin: 60, title: "Outdoor Civil Ceremony", type: "ELASTIC", location: "Garden Gazebo" },
    { id: "step_03", time: "18:00", realStart: "18:25", planned: "18:00", durationMin: 90, title: "Hall Entrance, Toast & Dinner Start", type: "ELASTIC", location: "Main Hall" },
    { id: "step_04", time: "20:30", durationMin: 30, title: "Buffets Open", type: "BUFFER", location: "Main Hall" },
    { id: "step_05", time: "21:00", durationMin: 30, title: "Cake & Sparklers", type: "HARD_ANCHOR", location: "Terrace" }
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
  const { liveState, markCurrentDone, undoLastStep, toggleSubtask, savedLocally } = useLiveStageState({
    steps: WEDDING.steps,
    weddingId: WEDDING.weddingId,
    initialLiveState: INITIAL_LIVE_STATE
  });

  const { steps } = WEDDING;
  const activeIndex = liveState.active_step_id
    ? steps.findIndex((step) => step.id === liveState.active_step_id)
    : -1;
  const currentStep = activeIndex >= 0 ? steps[activeIndex] : null;
  const nextStep = activeIndex >= 0 ? steps[activeIndex + 1] ?? null : null;
  const completedCount = liveState.completed_step_ids.length;
  const isComplete = !currentStep;
  const realStart = currentStep
    ? liveState.actual_timestamps[currentStep.id] ?? currentStep.realStart ?? currentStep.time
    : null;
  const estimatedEnd = currentStep ? addMinutesToClock(realStart, currentStep.durationMin) : null;
  const stepTypeClass = currentStep ? STEP_TYPE_STYLES[currentStep.type] ?? STEP_TYPE_STYLES.ELASTIC : '';

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
          <span className="bg-[#111d3b] px-3 py-1.5 rounded text-white font-mono font-semibold border border-[#2b3d73] text-sm">18:25</span>
          <span className="bg-[#ED2939]/20 border border-[#ED2939]/60 text-[#ff6b75] px-3 py-1.5 rounded font-semibold text-sm">+{WEDDING.driftMinutes}m LATE</span>
          <span className="text-slate-300 font-medium hidden md:inline">Wedding: <strong className="text-white">{WEDDING.couple}</strong></span>
        </div>

        <div className="flex flex-wrap items-center gap-2 my-2 sm:my-0">
          <CulturalRulesBar rules={WEDDING.culturalRules} />
          <span className="bg-amber-950/80 border border-amber-800 text-amber-300 px-2.5 py-1 rounded cursor-pointer hover:bg-amber-900 transition">⚠️ VIP Radar ({WEDDING.vipRadarCount})</span>
          <span className="bg-[#002395]/40 border border-[#3b5bdb] text-[#849dff] px-2.5 py-1 rounded cursor-pointer hover:bg-[#002395]/60 transition">🃏 Jokers ({WEDDING.jokersCount})</span>
        </div>

        <div className="flex items-center space-x-3 font-mono">
          <span className="text-slate-400">PIN: <strong className="text-white">{WEDDING.syncPin}</strong></span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">2 Dev</span>
          <span className="bg-[#111d3b] text-slate-200 px-2.5 py-1 rounded text-xs border border-[#2b3d73] flex items-center space-x-1.5">
            <span className="flex h-2 w-2 rounded-full bg-[#002395] inline-block"></span>
            <span>Role: 🎤 {WEDDING.role}</span>
          </span>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
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

                  {/* DJ / Audio Cues */}
                  <div className="bg-[#070b19]/60 p-3.5 rounded-lg border border-[#1c2a52]">
                    <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#002395]"></span>
                      <span>🎧 DJ / Audio Cues</span>
                    </h3>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start space-x-2">
                        <span className="text-cyan-400 font-mono text-xs mt-0.5">🎵</span>
                        <span>Background dinner music (Kurp playlist active).</span>
                      </li>
                      <li className="text-xs text-slate-400 bg-[#0b132b] p-2 rounded border border-[#1c2a52] mt-2">
                        ⚡ Remote Stage Ping Ready: <span className="text-white font-mono">Synced to DJ Booth View</span>
                      </li>
                    </ul>
                  </div>
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

              {/* Teleprompter Button Prompt inside Active Card */}
              <div className="mt-4 pt-3 border-t border-[#1c2a52] flex items-center justify-between">
                <button className="bg-[#111d3b] hover:bg-[#1c2a52] text-slate-200 px-4 py-2 rounded-lg text-xs font-heading font-semibold transition border border-[#2b3d73]">
                  📖 Open Teleprompter / Script Overlay
                </button>
                <span className="text-xs text-slate-400 font-mono">Step {activeIndex + 1} of {steps.length}</span>
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
            {nextStep ? (
              <>
                <div className="text-lg font-heading font-bold text-white mt-1">{nextStep.title}</div>
                <div className="text-xs text-[#849dff] font-mono mt-1">Planned: {nextStep.time}</div>
              </>
            ) : (
              <div className="text-sm text-slate-400 mt-1">No further steps — event complete.</div>
            )}
          </div>

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

          {/* Silent Stage Pings to DJ */}
          <div className="bg-[#0b132b]/95 border border-[#1c2a52] rounded-xl p-4 shadow-lg flex-1">
            <h3 className="text-xs font-heading font-bold text-white uppercase tracking-wider mb-2">📡 Silent Stage Pings</h3>
            <div className="grid grid-cols-2 gap-2">
              <button className="bg-[#002395]/40 hover:bg-[#002395]/70 border border-[#3b5bdb] text-white p-2 rounded text-xs font-semibold transition text-center shadow">
                ▶️ Drop Track
              </button>
              <button className="bg-[#111d3b] hover:bg-[#1c2a52] border border-[#2b3d73] text-slate-200 p-2 rounded text-xs font-semibold transition text-center">
                🔉 Fade Music
              </button>
              <button className="bg-[#111d3b] hover:bg-[#1c2a52] border border-[#2b3d73] text-slate-200 p-2 rounded text-xs font-semibold transition text-center">
                ⏳ Hold 2m
              </button>
              <button className="bg-[#002395]/40 hover:bg-[#002395]/70 border border-[#3b5bdb] text-white p-2 rounded text-xs font-semibold transition text-center shadow">
                🎤 Ready
              </button>
            </div>
          </div>

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

    </div>
  );
}
