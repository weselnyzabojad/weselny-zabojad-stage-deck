import { buildBeforeSeasonModel } from '../../lib/socialSeason.js';

export default function BeforeSeasonStory({ seasonData = null }) {
  const model = buildBeforeSeasonModel(seasonData);
  const countries = model.destinationList
    .map((entry) => entry.country)
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="flex flex-1 flex-col px-16">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[24px] uppercase tracking-[0.32em] text-[#FBBF24]">
          Stage Deck · Before season
        </span>
        <span className="rounded-full border border-[#FBBF24]/50 bg-[#FBBF24]/10 px-5 py-2 font-mono text-[22px] uppercase tracking-[0.18em] text-[#FDE68A]">
          Preview
        </span>
      </div>

      <div className="mt-14">
        <div className="flex gap-2" aria-hidden="true">
          <span className="h-2 w-24 rounded-full bg-[#0055A4]" />
          <span className="h-2 w-24 rounded-full bg-white" />
          <span className="h-2 w-24 rounded-full bg-[#EF4135]" />
        </div>
        <p className="mt-8 font-mono text-[28px] uppercase tracking-[0.24em] text-[#FBBF24]">
          Saison {model.seasonYear ?? '—'}
        </p>
        {model.available && model.hasPlan ? (
          <>
            <h2 className="mt-3 font-heading text-[150px] leading-none font-bold tabular-nums text-[#F8FAFC]">
              J−{model.daysUntil ?? '—'}
            </h2>
            <p className="mt-4 font-heading text-[44px] font-semibold text-[#F8FAFC]">
              {model.destinations} destinations
            </p>
            <p className="mt-3 font-mono text-[30px] text-[#CBD5E1]">{countries || '—'}</p>
          </>
        ) : (
          <h2 className="mt-3 font-heading text-[72px] leading-tight font-bold text-[#F8FAFC]">
            Aucun plan de saison à venir
          </h2>
        )}
      </div>

      <div className="absolute inset-x-16 bottom-[460px] flex items-end justify-between border-t border-white/10 pt-6">
        <span className="font-heading text-[36px] font-semibold text-[#F8FAFC]">Stage Deck</span>
        <span className="font-mono text-[22px] text-[#FBBF24]">deck.weselnyzabojad.pl</span>
      </div>
    </div>
  );
}
