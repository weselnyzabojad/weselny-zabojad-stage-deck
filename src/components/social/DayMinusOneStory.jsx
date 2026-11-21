import { useState } from 'react';
import { buildDayMinusOneModel } from '../../lib/socialDayMinusOne.js';

function Stat({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 px-9 py-8">
      <div className="font-mono text-[26px] uppercase tracking-[0.22em] text-[#93C5FD]">{label}</div>
      <div className="mt-3 font-heading text-[92px] leading-none font-bold tabular-nums text-[#F8FAFC]">
        {value}
      </div>
    </div>
  );
}

export default function DayMinusOneStory({ wedding = null, liveState = null, now = null, surface = 'mc' }) {
  const [mountedAt] = useState(() => new Date());
  const adminMode = surface === 'admin';
  const model = buildDayMinusOneModel({ wedding, liveState, now: now ?? mountedAt });
  const languages = model.languages.length > 0 ? model.languages.join(' · ') : '—';
  return (
    <div className="flex flex-1 flex-col px-16" data-admin-mode={adminMode ? 'true' : 'false'}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[24px] uppercase tracking-[0.32em] text-[#93C5FD]">
          Stage Deck · J−1
        </span>
        <span
          className={`rounded-full border px-5 py-2 font-mono text-[22px] uppercase tracking-[0.18em] ${
            model.readyToPost
              ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200'
              : 'border-white/20 bg-white/5 text-[#CBD5E1]'
          }`}
        >
          {model.readyToPost ? 'Prêt à publier' : 'Aperçu'}
        </span>
      </div>

      <div className="mt-14">
        <div className="flex gap-2" aria-hidden="true">
          <span className="h-2 w-24 rounded-full bg-[#0055A4]" />
          <span className="h-2 w-24 rounded-full bg-white" />
          <span className="h-2 w-24 rounded-full bg-[#EF4135]" />
        </div>
        <p className="mt-8 font-mono text-[28px] uppercase tracking-[0.24em] text-[#93C5FD]">
          Préparation
        </p>
        <h2 className="mt-4 font-heading text-[112px] leading-[0.95] font-bold tracking-tight text-[#F8FAFC]">
          {model.country || 'Destination'}
        </h2>
        <p className="mt-6 font-mono text-[34px] text-[#CBD5E1]">{languages}</p>
      </div>

      <div className="mt-14 grid grid-cols-2 gap-6">
        <Stat label="Étapes" value={model.stepCount} />
        <Stat label="Rôles" value={model.roleCount} />
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-[#0B1220]/80 px-9 py-8">
        <div className="font-mono text-[26px] uppercase tracking-[0.22em] text-[#93C5FD]">
          Politique du lieu
        </div>
        <div className="mt-4 flex items-center justify-between gap-6">
          <span className="font-heading text-[54px] font-semibold text-[#F8FAFC]">
            {model.policy.armed ? 'Armée' : 'À confirmer'}
          </span>
          <div className="text-right font-mono text-[24px] text-[#CBD5E1]">
            {model.policy.decibelLimit != null ? (
              <div>{model.policy.decibelLimit} dB</div>
            ) : null}
            {model.policy.forbiddenFx > 0 ? <div>{model.policy.forbiddenFx} FX bloqués</div> : null}
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-end justify-between border-t border-white/10 pt-8">
        <span className="font-heading text-[40px] font-semibold text-[#F8FAFC]">Stage Deck</span>
        <span className="font-mono text-[24px] text-[#93C5FD]">deck.weselnyzabojad.pl</span>
      </div>
    </div>
  );
}
