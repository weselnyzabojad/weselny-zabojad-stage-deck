import { buildSeasonModel } from '../../lib/socialSeason.js';

function Stat({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-6">
      <div className="font-mono text-[22px] uppercase tracking-[0.2em] text-[#FBBF24]">{label}</div>
      <div className="mt-2 font-heading text-[64px] leading-none font-bold tabular-nums text-[#F8FAFC]">
        {value}
      </div>
    </div>
  );
}

export default function SeasonStory({ seasonData = null }) {
  const model = buildSeasonModel(seasonData);
  return (
    <div className="relative flex flex-1 flex-col px-16">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[24px] uppercase tracking-[0.32em] text-[#FBBF24]">
          Stage Deck · Saison
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
          Saison {model.seasonYear ?? ''}
        </p>
        {model.hasData ? (
          <>
            <h2 className="mt-3 font-heading text-[184px] leading-none font-bold tabular-nums text-[#F8FAFC]">
              {model.averagePercent ?? '—'}
              <span className="text-[86px] text-[#FDE68A]">%</span>
            </h2>
            <p className="mt-4 font-heading text-[44px] font-semibold text-[#F8FAFC]">
              compatibilité moyenne
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-3 font-heading text-[84px] leading-tight font-bold text-[#F8FAFC]">
              Pas encore assez de données
            </h2>
            <p className="mt-5 font-mono text-[30px] text-[#CBD5E1]">
              Publiez les récapitulatifs de saison pour alimenter cette Story.
            </p>
          </>
        )}
      </div>

      <div className="mt-12 grid grid-cols-3 gap-5">
        <Stat label="Mariages" value={model.compatibilityWeddings ?? '—'} />
        <Stat label="Réponses" value={model.answered ?? '—'} />
        <Stat label="Questions" value={model.total ?? '—'} />
      </div>

      {model.topQuestion ? (
        <div className="mt-6 rounded-3xl border border-white/10 bg-[#0B1220]/80 px-9 py-6">
          <div className="font-mono text-[22px] uppercase tracking-[0.2em] text-[#FBBF24]">
            Question la plus partagée
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-heading text-[44px] font-semibold text-[#F8FAFC]">Q&amp;R</span>
            <span className="font-heading text-[56px] font-bold text-[#FDE68A]">
              {model.topQuestion.percent ?? '—'}%
            </span>
          </div>
        </div>
      ) : null}

      <div
        data-sticker-zone="true"
        className="pointer-events-none absolute inset-x-6 bottom-4 flex h-[420px] items-center justify-center rounded-[40px] border-2 border-dashed border-[#FBBF24]/40"
      >
        <span className="font-mono text-[26px] uppercase tracking-[0.24em] text-[#FBBF24]/50">
          Zone sticker Instagram
        </span>
      </div>

      <div className="absolute inset-x-16 bottom-[460px] flex items-end justify-between border-t border-white/10 pt-6">
        <span className="font-heading text-[36px] font-semibold text-[#F8FAFC]">Stage Deck</span>
        <span className="font-mono text-[22px] text-[#FBBF24]">deck.weselnyzabojad.pl</span>
      </div>
    </div>
  );
}
