const RULES = [
  {
    key: 'sto_lat',
    label: 'Sto Lat',
    icon: '🎶',
    statusLabels: {
      YES: 'YES',
      YES_EXPLAIN: 'YES + EXPLAIN',
      STRICT_NO: 'STRICT NO',
      TBC: 'TBC',
    },
  },
  {
    key: 'gorzko',
    label: 'Gorzko',
    icon: '🥃',
    statusLabels: {
      YES: 'YES',
      IF_GUESTS_START: 'GUESTS INITIATE',
      STRICT_NO: 'STRICT NO',
      TBC: 'TBC',
    },
  },
  {
    key: 'bread_salt',
    label: 'Bread & Salt',
    icon: '🍞',
    statusLabels: {
      YES: 'YES',
      NO: 'NO',
      TBC: 'TBC',
    },
  },
];

const TONES = {
  yes: {
    chip: 'border-emerald-700/70 bg-emerald-950/60',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
  },
  conditional: {
    chip: 'border-amber-700/70 bg-amber-950/70',
    text: 'text-amber-300',
    dot: 'bg-amber-400',
  },
  no: {
    chip: 'border-alert/60 bg-alert/15',
    text: 'text-alert-soft',
    dot: 'bg-alert',
  },
  pending: {
    chip: 'border-line-strong bg-raised',
    text: 'text-slate-300',
    dot: 'bg-slate-400',
  },
};

function toneFor(status) {
  if (status === 'YES' || status === 'YES_EXPLAIN') return 'yes';
  if (status === 'IF_GUESTS_START' || status === 'TBC') return 'conditional';
  if (status === 'STRICT_NO' || status === 'NO') return 'no';
  return 'pending';
}

function labelFor(status) {
  return status ? status.replaceAll('_', ' ') : 'TBC';
}

export default function CulturalRulesBar({ rules = {} }) {
  return (
    <section
      aria-label="Cultural hard rules"
      className="flex flex-wrap items-center gap-2"
    >
      {RULES.map(({ key, label, icon, statusLabels }) => {
        const rule = rules[key] ?? {};
        const status = (rule.status ?? 'TBC').replaceAll(' ', '_').toUpperCase();
        const tone = toneFor(status);
        const colors = TONES[tone];
        const statusLabel = statusLabels[status] ?? labelFor(status);
        const note = rule.note?.trim();
        const description = `${label}: ${statusLabel}${note ? ` — ${note}` : ''}`;

        return (
          <div
            key={key}
            role="note"
            aria-label={description}
            title={description}
            className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 ${colors.chip}`}
          >
            <span aria-hidden="true" className="mt-0.5 text-sm leading-none">
              {icon}
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading text-[10px] font-bold uppercase tracking-widest text-slate-100">
                  {label}
                </span>
                <span className={`flex items-center gap-1 font-mono text-[10px] font-bold ${colors.text}`}>
                  <span
                    aria-hidden="true"
                    className={`inline-block h-1.5 w-1.5 rounded-full ${colors.dot}`}
                  />
                  {statusLabel}
                </span>
              </div>
              {note ? (
                <p className="mt-0.5 hidden max-w-[190px] truncate text-[10px] leading-tight text-slate-400 sm:block">
                  {note}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </section>
  );
}
