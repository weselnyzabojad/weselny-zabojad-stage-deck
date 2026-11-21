import { buildMonthModel } from '../../lib/socialSeason.js';

function Stat({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-6">
      <div className="font-mono text-[22px] uppercase tracking-[0.2em] text-[#FBBF24]">{label}</div>
      <div className="mt-2 font-heading text-[64px] leading-none font-bold tabular-nums text-[#F8FAFC]">
        {value ?? '—'}
      </div>
    </div>
  );
}

export default function MonthStory({ seasonData = null }) {
  const model = buildMonthModel(seasonData);
  return (
    <div className="flex flex-1 flex-col px-16">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[24px] uppercase tracking-[0.32em] text-[#FBBF24]">
          Stage Deck · Month
        </span>
        <span className="rounded-full border border-[#FBBF24]/50 bg-[#FBBF24]/10 px-5 py-2 font-mono text-[22px] uppercase tracking-[0.18em] text-[#FDE68A]">
          Test Zgodności
        </span>
      </div>

      <div className="mt-14">
        <div className="flex gap-2" aria-hidden="true">
          <span className="h-2 w-24 rounded-full bg-[#0055A4]" />
          <span className="h-2 w-24 rounded-full bg-white" />
          <span className="h-2 w-24 rounded-full bg-[#EF4135]" />
        </div>
        <p className="mt-8 font-mono text-[28px] uppercase tracking-[0.24em] text-[#FBBF24]">
          {model.month ?? '—'}/{model.year ?? '—'}
        </p>
        {model.hasData ? (
          <h2 className="mt-3 font-heading text-[150px] leading-none font-bold tabular-nums text-[#F8FAFC]">
            {model.averagePercent ?? '—'}
            <span className="text-[76px] text-[#FDE68A]">%</span>
          </h2>
        ) : (
          <h2 className="mt-3 font-heading text-[72px] leading-tight font-bold text-[#F8FAFC]">
            Pas encore de données pour ce mois
          </h2>
        )}
      </div>

      <div className="mt-12 grid grid-cols-2 gap-5">
        <Stat label="Invités" value={model.guests.total} />
        <Stat label="PL / FR / autres" value={`${model.guests.pl ?? '—'} / ${model.guests.fr ?? '—'} / ${model.guests.other ?? '—'}`} />
        <Stat label="Réponses" value={model.answered} />
        <Stat label="Questions" value={model.total} />
      </div>

      <div className="absolute inset-x-16 bottom-[460px] flex items-end justify-between border-t border-white/10 pt-6">
        <span className="font-heading text-[36px] font-semibold text-[#F8FAFC]">Stage Deck</span>
        <span className="font-mono text-[22px] text-[#FBBF24]">deck.weselnyzabojad.pl</span>
      </div>
    </div>
  );
}
