import { useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import { nextFocusIndex, toggleRailOpen } from '../lib/stageRail.js';
import StageStepCard from './StageStepCard.jsx';

function cardKey(entry) {
  return entry?.step?.id ?? `index-${entry?.index}`;
}

// Roving focus inside one rail. Cards are the only tab stops, so Arrow keys
// move between them, Home/End jump to the ends and Escape collapses the zone.
function handleRailKeyDown(event, onCollapse) {
  if (event.key === 'Escape') {
    event.preventDefault();
    onCollapse();
    return;
  }

  const buttons = [...event.currentTarget.querySelectorAll('[data-rail-card]')];
  if (buttons.length === 0) return;
  const node = event.target.closest?.('[data-rail-card]');
  const index = buttons.indexOf(node);
  if (index < 0) return;

  const next = nextFocusIndex(event.key, index, buttons.length);
  if (next >= 0 && next !== index) {
    event.preventDefault();
    buttons[next].focus();
  }
}

function RailZone({
  zone,
  label,
  entries,
  variant,
  empty,
  openKey,
  onToggle,
  onCollapse,
}) {
  return (
    <section aria-label={label} className="flex min-h-0 flex-col gap-2">
      <h2 className="px-0.5 font-heading text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label} ({entries.length})
      </h2>
      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-card/40 px-3 py-2 text-[11px] text-slate-500">
          {empty}
        </p>
      ) : (
        <ol
          className="flex flex-col gap-2"
          onKeyDown={(event) => handleRailKeyDown(event, onCollapse)}
        >
          {entries.map((entry) => {
            const key = cardKey(entry);
            return (
              <li key={key}>
                <StageStepCard
                  entry={entry}
                  variant={typeof variant === 'function' ? variant(entry) : variant}
                  collapsible
                  expanded={openKey === key}
                  onToggle={() => onToggle(zone, key)}
                />
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/**
 * Three-zone rail: completed steps on the left, the current step as the hero
 * in the centre and upcoming steps on the right.
 *
 * The current step is always expanded. Each side rail allows one open card at a
 * time; opening a second closes the first. Arrow/Home/End/Escape drive roving
 * focus within a rail.
 */
export default function StageRail({
  done = [],
  current = null,
  upcoming = [],
  currentBody = null,
  labels = {},
}) {
  const { t } = useI18n();
  const [openByZone, setOpenByZone] = useState({ done: null, upcoming: null });

  const copy = {
    rail: t('mc.rail.rail'),
    done: t('mc.rail.done'),
    current: t('mc.rail.now'),
    upcoming: t('mc.rail.upcoming'),
    noDone: t('mc.rail.noDone'),
    noUpcoming: t('mc.rail.noUpcoming'),
    noCurrent: t('mc.rail.noCurrent'),
    ...labels,
  };

  const toggle = (zone, key) => {
    setOpenByZone((prev) => toggleRailOpen(prev, zone, key));
  };

  const collapse = (zone) => {
    setOpenByZone((prev) => (prev[zone] == null ? prev : { ...prev, [zone]: null }));
  };

  return (
    <section
      aria-label={copy.rail}
      data-testid="stage-rail"
      className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start"
    >
      <div className="order-2 min-w-0 lg:order-1">
        <RailZone
          zone="done"
          label={copy.done}
          entries={done}
          variant="done"
          empty={copy.noDone}
          openKey={openByZone.done}
          onToggle={toggle}
          onCollapse={() => collapse('done')}
        />
      </div>

      <div className="order-1 min-w-0 lg:order-2">
        <section aria-label={copy.current} className="flex flex-col gap-2">
          <h2 className="px-0.5 font-heading text-[10px] font-semibold uppercase tracking-widest text-brand-soft">
            {copy.current}
          </h2>
          {current ? (
            <StageStepCard entry={current} variant="current">{currentBody}</StageStepCard>
          ) : (
            <p className="rounded-xl border border-dashed border-line bg-card/40 px-3 py-6 text-center text-xs text-slate-500">
              {copy.noCurrent}
            </p>
          )}
        </section>
      </div>

      <div className="order-3 min-w-0">
        <RailZone
          zone="upcoming"
          label={copy.upcoming}
          entries={upcoming}
          variant={(entry) => (cardKey(entry) === cardKey(upcoming[0]) ? 'next' : 'later')}
          empty={copy.noUpcoming}
          openKey={openByZone.upcoming}
          onToggle={toggle}
          onCollapse={() => collapse('upcoming')}
        />
      </div>
    </section>
  );
}
