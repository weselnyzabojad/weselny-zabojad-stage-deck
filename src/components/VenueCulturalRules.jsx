const RULE_LABELS = {
  sto_lat: 'Sto Lat',
  gorzko: 'Gorzko',
  bread_salt: 'Bread & Salt',
};

export default function VenueCulturalRules({ rules = {} }) {
  const venueRules = Object.entries(rules).filter(([, rule]) => rule?.actor === 'VENUE');
  if (venueRules.length === 0) return null;

  return (
    <section
      aria-label="Venue cultural rules"
      className="flex flex-wrap items-center justify-center gap-1.5"
    >
      {venueRules.map(([ruleKey, rule]) => (
        <div
          key={ruleKey}
          data-cultural-rule={ruleKey}
          className="flex items-center gap-1.5 rounded-xl border border-line-strong bg-raised px-2.5 py-1 text-[10px] text-ink"
        >
          <span className="font-heading font-bold uppercase tracking-[0.12em]">
            {RULE_LABELS[ruleKey] ?? ruleKey}
          </span>
          <span className="font-mono text-[9px] text-muted">
            {String(rule.status ?? 'TBC').replaceAll('_', ' ')}
          </span>
        </div>
      ))}
    </section>
  );
}
