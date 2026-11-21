import { useState } from 'react';
import { buildNextMonthModel } from '../../lib/socialNextMonth.js';

export default function NextMonthStory({
  weddings = [],
  now = null,
  timeZone = 'UTC',
  page = 0,
}) {
  const [mountedAt] = useState(() => new Date());
  const model = buildNextMonthModel({ weddings, now: now ?? mountedAt, timeZone });
  const group = model.pages[page] ?? model.pages[0] ?? null;

  if (!model.available || !group) {
    return (
      <div className="flex flex-1 flex-col px-16">
        <span className="font-mono text-[24px] uppercase tracking-[0.32em] text-[#FBBF24]">
          Stage Deck · Next month
        </span>
        <h2 className="mt-24 font-heading text-[84px] leading-tight font-bold text-[#F8FAFC]">
          Aucun mariage le mois prochain
        </h2>
        <p className="mt-4 font-mono text-[30px] text-[#CBD5E1]">
          {model.target.month}/{model.target.year}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-16">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[24px] uppercase tracking-[0.32em] text-[#FBBF24]">
          Stage Deck · Next month
        </span>
        <span className="rounded-full border border-[#FBBF24]/50 bg-[#FBBF24]/10 px-5 py-2 font-mono text-[22px] uppercase tracking-[0.18em] text-[#FDE68A]">
          {group.page}/{group.total}
        </span>
      </div>
      <p className="mt-12 font-mono text-[28px] uppercase tracking-[0.24em] text-[#FBBF24]">
        {model.target.month}/{model.target.year}
      </p>
      <ul className="mt-6 space-y-4">
        {group.weddings.map((wedding) => {
          const date = new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'long',
            timeZone: 'UTC',
          }).format(new Date(`${wedding.dateISO}T12:00:00Z`));
          return (
            <li
              key={wedding.id ?? `${wedding.dateISO}-${wedding.bride ?? ''}`}
              className="rounded-3xl border border-white/10 bg-white/5 px-9 py-6"
            >
              <div className="font-heading text-[42px] font-semibold text-[#F8FAFC]">
                {[wedding.bride, wedding.groom].filter(Boolean).join(' & ') || '—'}
              </div>
              <div className="mt-2 font-mono text-[24px] text-[#CBD5E1]">
                {[wedding.city, wedding.country].filter(Boolean).join(' · ') || '—'} · {date}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex items-end justify-between border-t border-white/10 pt-8">
        <span className="font-heading text-[36px] font-semibold text-[#F8FAFC]">Stage Deck</span>
        <span className="font-mono text-[22px] text-[#FBBF24]">deck.weselnyzabojad.pl</span>
      </div>
    </div>
  );
}
