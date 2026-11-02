import React, { useState } from 'react';
import logo from './assets/img/logo.png';
import CulturalRulesBar from './components/CulturalRulesBar';

export default function App() {
  const [weddingState, setWeddingState] = useState({
    couple: "Jennifer & Guillaume",
    date: "20.08.2026",
    syncPin: "2008",
    role: "MC",
    activeStepIndex: 2,
    driftMinutes: 25,
    culturalRules: {
      sto_lat: { status: "STRICT_NO", note: "Inform guests: NO Sto Lat tonight!" },
      gorzko: { status: "STRICT_NO", note: "No Gorzko Gorzko" },
      bread_salt: { status: "YES", note: "Vodka vs water shot, break glasses" }
    },
    vipRadarCount: 4,
    jokersCount: 3,
    steps: [
      { id: "step_01", time: "16:30", title: "Aperitif in Garden", type: "BUFFER", location: "Garden" },
      { id: "step_02", time: "17:00", title: "Outdoor Civil Ceremony", type: "ELASTIC", location: "Garden Gazebo" },
      { id: "step_03", time: "18:00", realStart: "18:25", planned: "18:00", title: "Hall Entrance, Toast & Dinner Start", type: "ELASTIC", location: "Main Hall" },
      { id: "step_04", time: "20:30", title: "Buffets Open", type: "BUFFER", location: "Main Hall" },
      { id: "step_05", time: "21:00", title: "Cake & Sparklers", type: "HARD_ANCHOR", location: "Terrace" }
    ]
  });

  const [subtasks, setSubtasks] = useState({
    "Parents' thank-you speech + gifts (with mic)": true,
    "Rosół + Tartare with Vodka shot": false,
    "Speeches between starter and main course": false
  });

  const toggleSubtask = (task) => {
    setSubtasks(prev => ({ ...prev, [task]: !prev[task] }));
  };

  const handleAdvance = () => {
    if (weddingState.activeStepIndex < weddingState.steps.length - 1) {
      setWeddingState(prev => ({ ...prev, activeStepIndex: prev.activeStepIndex + 1 }));
    }
  };

  const currentStep = weddingState.steps[weddingState.activeStepIndex];
  const nextStep = weddingState.steps[weddingState.activeStepIndex + 1] || { time: "23:30", title: "Late Night Party" };

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
          <span className="bg-[#ED2939]/20 border border-[#ED2939]/60 text-[#ff6b75] px-3 py-1.5 rounded font-semibold text-sm">+{weddingState.driftMinutes}m LATE</span>
          <span className="text-slate-300 font-medium hidden md:inline">Wedding: <strong className="text-white">{weddingState.couple}</strong></span>
        </div>

        <div className="flex flex-wrap items-center gap-2 my-2 sm:my-0">
          <CulturalRulesBar rules={weddingState.culturalRules} />
          <span className="bg-amber-950/80 border border-amber-800 text-amber-300 px-2.5 py-1 rounded cursor-pointer hover:bg-amber-900 transition">⚠️ VIP Radar ({weddingState.vipRadarCount})</span>
          <span className="bg-[#002395]/40 border border-[#3b5bdb] text-[#849dff] px-2.5 py-1 rounded cursor-pointer hover:bg-[#002395]/60 transition">🃏 Jokers ({weddingState.jokersCount})</span>
        </div>

        <div className="flex items-center space-x-3 font-mono">
          <span className="text-slate-400">PIN: <strong className="text-white">{weddingState.syncPin}</strong></span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">2 Dev</span>
          <span className="bg-[#111d3b] text-slate-200 px-2.5 py-1 rounded text-xs border border-[#2b3d73] flex items-center space-x-1.5">
            <span className="flex h-2 w-2 rounded-full bg-[#002395] inline-block"></span>
            <span>Role: 🎤 {weddingState.role}</span>
          </span>
        </div>
      </header>

      {/* ================= MAIN DASHBOARD (70% / 30% SPLIT) ================= */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-10 gap-4 p-4 overflow-y-auto">
        
        {/* ACTIVE STEP (70% Width -> 7 cols on lg) */}
        <section className="lg:col-span-7 bg-[#0b132b]/95 border border-[#1c2a52] rounded-xl p-5 flex flex-col justify-between shadow-xl relative">
          <div>
            {/* Step Header & Timing */}
            <div className="flex items-center justify-between border-b border-[#1c2a52] pb-3 mb-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-white font-heading font-semibold bg-[#002395] px-2.5 py-1 rounded border border-[#3b5bdb]">
                  ELASTIC STEP
                </span>
                <h1 className="text-2xl font-heading font-bold text-white mt-2">{currentStep.title}</h1>
                <div className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
                  <span>📍 Location: <strong className="text-slate-200">{currentStep.location}</strong></span>
                </div>
              </div>
              <div className="text-right bg-[#070b19]/80 p-3 rounded-lg border border-[#1c2a52]">
                <div className="text-xs text-slate-400">Planned: <span className="line-through text-slate-500">{currentStep.planned || currentStep.time}</span></div>
                <div className="text-sm font-mono text-white font-semibold mt-0.5">Real Start: {currentStep.realStart || "18:25"}</div>
                <div className="text-xs text-slate-300 mt-0.5">Est. End: 19:55</div>
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
                {Object.entries(subtasks).map(([task, checked]) => (
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
                ))}
              </div>
            </div>
          </div>

          {/* Teleprompter Button Prompt inside Active Card */}
          <div className="mt-4 pt-3 border-t border-[#1c2a52] flex items-center justify-between">
            <button className="bg-[#111d3b] hover:bg-[#1c2a52] text-slate-200 px-4 py-2 rounded-lg text-xs font-heading font-semibold transition border border-[#2b3d73]">
              📖 Open Teleprompter / Script Overlay
            </button>
            <span className="text-xs text-slate-400 font-mono">Step 3 of 5</span>
          </div>
        </section>

        {/* PEEK NEXT & HARD ANCHOR RADAR (30% Width -> 3 cols on lg) */}
        <section className="lg:col-span-3 flex flex-col space-y-4">
          
          {/* Peek Next */}
          <div className="bg-[#0b132b]/95 border border-[#1c2a52] rounded-xl p-4 shadow-lg">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-heading font-semibold">PEEK NEXT</span>
            <div className="text-lg font-heading font-bold text-white mt-1">{nextStep.title}</div>
            <div className="text-xs text-[#849dff] font-mono mt-1">Planned: {nextStep.time} (Est: 20:55)</div>
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
        </div>

        {/* Primary Action Button (Updated to French Blue Accent) */}
        <div className="flex items-center space-x-3 ml-auto">
          <button 
            onClick={handleAdvance}
            className="bg-[#002395] hover:bg-[#1a3cb0] active:bg-[#00186b] text-white px-6 py-2.5 rounded-xl text-sm font-heading font-bold shadow-lg shadow-blue-950/60 transition flex items-center space-x-2 border border-[#3b5bdb]"
          >
            <span>MARK DONE & ADVANCE</span>
            <span className="text-lg">➔</span>
          </button>
        </div>

      </footer>

    </div>
  );
}