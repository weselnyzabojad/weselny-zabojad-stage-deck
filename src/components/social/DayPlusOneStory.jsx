import { useState } from 'react';
import { buildDayPlusOneModel } from '../../lib/socialDayPlusOne.js';

function Kpi({ label, value, hint }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-7">
      <div className="font-mono text-[24px] uppercase tracking-[0.2em] text-[#93C5FD]">{label}</div>
      <div className="mt-2 font-heading text-[76px] leading-none font-bold tabular-nums text-[#F8FAFC]">
        {value}
      </div>
      {hint ? <div className="mt-2 font-mono text-[22px] text-[#CBD5E1]">{hint}</div> : null}
    </div>
  );
}

export default function DayPlusOneStory({
  wedding = null,
  liveState = null,
  recap = null,
  requests = [],
  now = null,
}) {
  const [mountedAt] = useState(() => new Date());
  const model = buildDayPlusOneModel({ wedding, liveState, recap, requests, now: now ?? mountedAt });
  const text = (value, suffix = '') => (value == null ? '—' : `${value}${suffix}`);
  return (
    <div className="flex flex-1 flex-col px-16">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[24px] uppercase tracking-[0.32em] text-[#93C5FD]">
          Stage Deck · J+1
        </span>
        <span
          className={`rounded-full border px-5 py-2 font-mono text-[22px] uppercase tracking-[0.18em] ${
            model.unlocked
              ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200'
              : 'border-white/20 bg-white/5 text-[#CBD5E1]'
          }`}
        >
          {model.unlocked ? 'Bilan publié' : 'En attente'}
        </span>
      </div>

      <div className="mt-14">
        <div className="flex gap-2" aria-hidden="true">
          <span className="h-2 w-24 rounded-full bg-[#0055A4]" />
          <span className="h-2 w-24 rounded-full bg-white" />
          <span className="h-2 w-24 rounded-full bg-[#EF4135]" />
        </div>
        <p className="mt-8 font-mono text-[28px] uppercase tracking-[0.24em] text-[#93C5FD]">
          Post-Event Wrapped
        </p>
        <h2 className="mt-4 font-heading text-[104px] leading-[0.95] font-bold tracking-tight text-[#F8FAFC]">
          Exécution
        </h2>
        <p className="mt-5 font-mono text-[32px] text-[#CBD5E1]">
          {text(model.completedSteps)} / {text(model.totalSteps)} étapes
        </p>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-6">
        <Kpi label="À l’heure" value={text(model.onTimePct, '%')} />
        <Kpi
          label="Dérive max"
          value={text(model.biggestDelayMinutes, ' min')}
          hint={`${text(model.scheduleChangeCount)} changements`}
        />
        <Kpi
          label="Demandes"
          value={text(model.requestsAccepted)}
          hint={`${text(model.requestsPlayed)} jouées`}
        />
        <Kpi label="Compatibilité" value={text(model.compatibilityPct, '%')} hint={`${text(model.gameCount)} jeux`} />
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-[#0B1220]/80 px-9 py-7">
        <div className="font-mono text-[24px] uppercase tracking-[0.2em] text-[#93C5FD]">
          Équilibre culturel
        </div>
        <p className="mt-3 font-heading text-[46px] font-semibold text-[#F8FAFC]">
          Sto Lat · {model.cultural.stoLat ?? '—'} · Gorzko · {model.cultural.gorzko ?? '—'}
        </p>
      </div>

      <div className="mt-auto flex items-end justify-between border-t border-white/10 pt-8">
        <span className="font-heading text-[40px] font-semibold text-[#F8FAFC]">Stage Deck</span>
        <span className="font-mono text-[24px] text-[#93C5FD]">deck.weselnyzabojad.pl</span>
      </div>
    </div>
  );
}
