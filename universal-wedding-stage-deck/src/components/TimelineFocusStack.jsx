import { useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import { buildFocusStack, focusStackTier } from '../lib/focusStack.js';
import { nextFocusIndex, toggleRailOpen } from '../lib/stageRail.js';
import StageStepCard from './StageStepCard.jsx';

function cardKey(entry) {
  return entry?.step?.id ?? `index-${entry?.index}`;
}

// Roving focus inside one zone. Cards are the only tab stops, so Arrow keys
// move between them, Home/End jump to the ends and Escape collapses the zone.
function handleZoneKeyDown(event, onCollapse) {
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

function FocusZone({
  zone,
  label,
  entries,
  variant,
  empty,
  openKey,
  onToggle,
  onCollapse,
  compact,
}) {
  return (
    <section
      aria-label={label}
      data-focus-zone={zone}
      className="flex min-h-0 flex-col gap-2"
    >
      <h2 className="px-0.5 font-heading text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label} ({entries.length})
      </h2>
      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-card/40 px-3 py-2 text-[11px] text-slate-500">
          {empty}
        </p>
      ) : (
        <ol
          className={`${compact ? '' : 'stage-rail-scroll '}flex flex-col gap-2`}
          onKeyDown={(event) => handleZoneKeyDown(event, onCollapse)}
        >
          {entries.map((entry, position) => {
            const key = cardKey(entry);
            const tier = focusStackTier(zone, position);
            return (
              <li
                key={key}
                className="relative"
                data-focus-card
                data-focus-depth={tier?.depth ?? position + 1}
                data-focus-opacity={tier?.opacity ?? 1}
                data-focus-scale={tier?.scale ?? 1}
                style={{ opacity: tier?.opacity ?? 1, zIndex: tier?.zIndex ?? 1 }}
              >
                <StageStepCard
                  entry={entry}
                  variant={typeof variant === 'function' ? variant(entry, position) : variant}
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
 * Universal timeline focus stack.
 *
 * One floating current card, at most two completed cards and at most two
 * future cards. The same component is used by every role and viewport; role
 * views may pass extra current-card content or hide controls, but the visible
 * counts and depth tiers are fixed by `buildFocusStack`.
 *
 * Hidden entries are not rendered at all, so they are also absent from the
 * accessibility tree and reading order.
 */
export default function TimelineFocusStack({
  entries = [],
  activeIndex,
  compact = false,
  currentBody = null,
  labels = {},
  className = '',
}) {
  const { t } = useI18n();
  const [openByZone, setOpenByZone] = useState({ history: null, future: null });
  const stack = buildFocusStack(entries, activeIndex);

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

  const rootClassName = compact
    ? 'grid grid-cols-1 gap-3'
    : 'grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start';

  return (
    <section
      aria-label={copy.rail}
      data-testid="timeline-focus-stack"
      data-focus-stack
      data-viewport={compact ? 'compact' : 'wide'}
      className={`${rootClassName} ${className}`.trim()}
    >
      <div className={`min-w-0 ${compact ? 'order-2' : 'order-2 lg:order-1'}`}>
        <FocusZone
          zone="history"
          label={copy.done}
          entries={stack.history}
          variant="done"
          empty={copy.noDone}
          openKey={openByZone.history}
          onToggle={toggle}
          onCollapse={() => collapse('history')}
          compact={compact}
        />
      </div>

      <div
        className={`min-w-0 ${
          compact ? 'order-1' : 'order-1 md:col-span-2 lg:col-span-1 lg:order-2'
        }`}
      >
        <section aria-label={copy.current} data-focus-zone="current" className="flex flex-col gap-2">
          <h2 className="px-0.5 font-heading text-[10px] font-semibold uppercase tracking-widest text-brand-soft">
            {copy.current}
          </h2>
          {stack.current ? (
            <div
              className="relative"
              data-focus-card
              data-focus-depth="0"
              data-focus-opacity="1"
              data-focus-scale="1"
              style={{ zIndex: 30 }}
            >
              <StageStepCard entry={stack.current} variant="current">
                {currentBody}
              </StageStepCard>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-line bg-card/40 px-3 py-6 text-center text-xs text-slate-500">
              {copy.noCurrent}
            </p>
          )}
        </section>
      </div>

      <div className="order-3 min-w-0">
        <FocusZone
          zone="future"
          label={copy.upcoming}
          entries={stack.future}
          variant={(_entry, position) => (position === 0 ? 'next' : 'later')}
          empty={copy.noUpcoming}
          openKey={openByZone.future}
          onToggle={toggle}
          onCollapse={() => collapse('future')}
          compact={compact}
        />
      </div>
    </section>
  );
}
