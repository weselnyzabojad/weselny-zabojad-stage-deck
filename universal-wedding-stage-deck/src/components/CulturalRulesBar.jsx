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
];

const OCZEPINY = {
  key: 'oczepiny',
  label: 'Oczepiny',
  icon: '🌙',
  statusLabels: {
    ON: 'ON',
    OFF: 'OFF',
    ACTIVE: 'ACTIVE',
  },
};

const TONES = {
  yes: {
    chip: 'border-emerald-700/70 bg-emerald-950/60',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
  },
  active: {
    chip: 'border-brand-strong bg-brand/30 ring-1 ring-brand-strong/50',
    text: 'text-brand-tint',
    dot: 'bg-brand-tint',
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
  if (status === 'YES' || status === 'YES_EXPLAIN' || status === 'ON') return 'yes';
  if (status === 'ACTIVE') return 'active';
  if (status === 'IF_GUESTS_START' || status === 'TBC') return 'conditional';
  if (status === 'STRICT_NO' || status === 'NO') return 'no';
  return 'pending';
}

function labelFor(status) {
  return status ? status.replaceAll('_', ' ') : 'TBC';
}

function RuleChip({ ruleKey, label, icon, status, statusLabels = {}, note = null }) {
  const normalizedStatus = (status ?? 'TBC').replaceAll(' ', '_').toUpperCase();
  const colors = TONES[toneFor(normalizedStatus)];
  const statusLabel = statusLabels[normalizedStatus] ?? labelFor(normalizedStatus);
  const cleanNote = note?.trim();
  // Keep aria-label/title without the note suffix so screen readers still
  // announce the rule state, but the visible note is removed per SR refine.
  const description = `${label}: ${statusLabel}${cleanNote ? ` — ${cleanNote}` : ''}`;

  return (
    <div
      key={ruleKey}
      role="note"
      aria-label={statusLabel}
      title={statusLabel}
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
        {/* Note text removed per MC top-bar refinement (project.md, 2026-11-06) */}
      </div>
    </div>
  );
}

export default function CulturalRulesBar({ rules = {}, oczepinyStatus = null }) {
  const oczepinyState = oczepinyStatus?.state ?? 'OFF';

  return (
    <section
      aria-label="Cultural hard rules"
      className="flex flex-wrap items-center gap-2"
    >
      {RULES.map(({ key, label, icon, statusLabels }) => {
        const rule = rules[key] ?? {};
        return (
          <RuleChip
            key={key}
            ruleKey={key}
            label={label}
            icon={icon}
            status={rule.status}
            statusLabels={statusLabels}
            note={rule.note}
          />
        );
      })}
      <RuleChip
        ruleKey={OCZEPINY.key}
        label={OCZEPINY.label}
        icon={OCZEPINY.icon}
        status={oczepinyState}
        statusLabels={OCZEPINY.statusLabels}
        note={
          oczepinyState === 'ACTIVE'
            ? 'Midnight tradition is live.'
            : oczepinyState === 'OFF'
              ? 'Not requested for this wedding.'
              : 'Scheduled for the midnight block.'
        }
      />
    </section>
  );
}
