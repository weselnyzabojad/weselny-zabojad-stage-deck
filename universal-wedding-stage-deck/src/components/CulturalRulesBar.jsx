import { desktopTone } from '../lib/topBarStyles.js';

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

// A requested tradition is green, an explicitly refused one is red. Values that
// do not decide either way (conditional / TBC) keep the default white surface.
const REQUESTED = new Set(['YES', 'YES_EXPLAIN', 'ON', 'ACTIVE', 'IF_GUESTS_START']);
const REFUSED = new Set(['STRICT_NO', 'NO', 'OFF']);

function toneFor(status) {
  if (REQUESTED.has(status)) return 'positive';
  if (REFUSED.has(status)) return 'negative';
  return 'neutral';
}

function labelFor(status) {
  return status ? status.replaceAll('_', ' ') : 'TBC';
}

function RuleChip({
  ruleKey,
  label,
  icon,
  status,
  statusLabels = {},
  note = null,
  compact = false,
  dense = false,
}) {
  const normalizedStatus = (status ?? 'TBC').replaceAll(' ', '_').toUpperCase();
  const toneKey = toneFor(normalizedStatus);
  const tone = desktopTone(toneKey);
  const statusLabel = statusLabels[normalizedStatus] ?? labelFor(normalizedStatus);
  const cleanNote = note?.trim();
  // The full state stays available to assistive tech even when pocket hides
  // the visible status text.
  const description = `${label}: ${statusLabel}${cleanNote ? ` — ${cleanNote}` : ''}`;

  // Pocket keeps the semantic surface and accessible state but reduces the
  // chip to its label. Desktop keeps the icon and visible status.
  if (compact) {
    return (
      <div
        key={ruleKey}
        role="note"
        aria-label={description}
        title={description}
        className={`flex items-center rounded-full px-2.5 py-1.5 font-heading text-[10px] font-bold uppercase tracking-[0.14em] shadow-sm backdrop-blur-sm ${tone}`}
      >
        <span>{label}</span>
      </div>
    );
  }

  return (
    <div
      key={ruleKey}
      role="note"
      aria-label={description}
      title={description}
      className={`flex min-w-0 flex-wrap items-center ${
        dense
          ? 'gap-x-1.5 gap-y-0.5 rounded-xl px-2 py-1'
          : 'gap-2 rounded-2xl px-3 py-1.5'
      } ${tone}`}
    >
      <span
        aria-hidden="true"
        className={`shrink-0 leading-none ${dense ? 'text-sm' : 'mt-0.5 text-lg'}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`font-heading font-semibold uppercase ${
              dense ? 'text-[10px] tracking-[0.12em]' : 'text-[11px] tracking-[0.18em]'
            }`}
          >
            {label}
          </span>
          <span
            className={`flex items-center gap-1 font-mono font-semibold ${
              dense ? 'text-[9px]' : 'text-[10px]'
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block rounded-full bg-current shadow-[0_0_8px_currentColor] ${
                dense ? 'h-1 w-1' : 'h-1.5 w-1.5'
              }`}
            />
            {statusLabel}
          </span>
        </div>
        {/* Note text removed per MC top-bar refinement (project.md, 2026-11-06) */}
      </div>
    </div>
  );
}

export default function CulturalRulesBar({
  rules = {},
  oczepinyStatus = null,
  compact = false,
  dense = false,
  grid = false,
  children = null,
  showRules = true,
}) {
  const oczepinyState = oczepinyStatus?.state ?? 'OFF';

  return (
    <section
      aria-label="Cultural hard rules"
      className={
        compact
          ? 'flex flex-wrap items-center justify-center gap-1.5'
          : grid
            ? 'grid max-w-full grid-cols-2 gap-1.5'
            : 'flex flex-wrap items-center gap-2'
      }
    >
      {showRules
        ? RULES.map(({ key, label, icon, statusLabels }) => {
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
                compact={compact}
                dense={dense}
              />
            );
          })
        : null}
      {showRules ? (
        <RuleChip
          ruleKey={OCZEPINY.key}
          label={OCZEPINY.label}
          icon={OCZEPINY.icon}
          status={oczepinyState}
          statusLabels={OCZEPINY.statusLabels}
          compact={compact}
          dense={dense}
          note={
            oczepinyState === 'ACTIVE'
              ? 'Midnight tradition is live.'
              : oczepinyState === 'OFF'
                ? 'Not requested for this wedding.'
                : 'Scheduled for the midnight block.'
          }
        />
      ) : null}
      {children}
    </section>
  );
}
