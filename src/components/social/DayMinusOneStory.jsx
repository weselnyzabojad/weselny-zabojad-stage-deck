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

function Flags({ codes }) {
  return (Array.isArray(codes) ? codes : []).map((code) => (
    <span
      key={code}
      className={`fi fi-${String(code).toLowerCase()}`}
      title={code}
    />
  ));
}

export default function DayMinusOneStory({ wedding = null, liveState = null, now = null, surface = 'mc' }) {
  const [mountedAt] = useState(() => new Date());
  const adminMode = surface === 'admin';
  const model = buildDayMinusOneModel({ wedding, liveState, now: now ?? mountedAt, surface });
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

      {adminMode && model.admin ? (
        <div className="mt-5 space-y-3 rounded-3xl border border-white/10 bg-[#0B1220]/80 px-9 py-7">
          <p className="font-mono text-[24px] uppercase tracking-[0.2em] text-[#93C5FD]">
            Couple & venue
          </p>
          <div className="flex items-center gap-4 font-heading text-[44px] font-semibold text-[#F8FAFC]">
            <span>{model.admin.bride.firstName || '—'}</span>
            <Flags codes={model.admin.bride.nationalities} />
            <span className="text-[#93C5FD]">&</span>
            <span>{model.admin.groom.firstName || '—'}</span>
            <Flags codes={model.admin.groom.nationalities} />
          </div>
          <p className="font-mono text-[26px] text-[#CBD5E1]">
            {[model.admin.venueName, model.admin.venueCity].filter(Boolean).join(', ') || '—'}
          </p>
          <p className="font-mono text-[24px] text-[#CBD5E1]">
            Guests: {model.admin.guests.total ?? '—'} · PL {model.admin.guests.pl ?? '—'} · FR{' '}
            {model.admin.guests.fr ?? '—'} · +{model.admin.guests.other ?? '—'}
            {model.admin.guests.childrenExpected != null
              ? ` · Children: ${model.admin.guests.childrenExpected ? 'yes' : 'no'}`
              : ''}
          </p>
          <p className="font-mono text-[24px] text-[#CBD5E1]">
            Sto Lat {model.admin.cultural.stoLat ?? '—'} · Gorzko{' '}
            {model.admin.cultural.gorzko ?? '—'} · Bread & Salt{' '}
            {model.admin.cultural.breadSalt ?? '—'}
          </p>
          <p className="font-mono text-[24px] text-[#CBD5E1]">
            Package {model.admin.servicePackage?.replaceAll('_', ' ') ?? '—'}
            {model.admin.vipDjName ? ` · ${model.admin.vipDjName}` : ''}
          </p>
        </div>
      ) : null}

      <div className="mt-auto flex items-end justify-between border-t border-white/10 pt-8">
        <span className="font-heading text-[40px] font-semibold text-[#F8FAFC]">Stage Deck</span>
        <span className="font-mono text-[24px] text-[#93C5FD]">deck.weselnyzabojad.pl</span>
      </div>
    </div>
  );
}
