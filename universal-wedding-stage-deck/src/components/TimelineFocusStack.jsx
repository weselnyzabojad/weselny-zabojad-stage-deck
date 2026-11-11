import { useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import { buildFocusStack, focusStackTier } from '../lib/focusStack.js';
import { nextFocusIndex, toggleRailOpen } from '../lib/stageRail.js';
import StageStepCard from './StageStepCard.jsx';
import CurrentStepTilt from './CurrentStepTilt.jsx';

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
  zoneScroll,
  entryBodies,
  photographerAvailable = null,
  hiddenCount = 0,
  expanded = false,
  onToggleExpanded,
  showMoreLabel,
  showLessLabel,
  polished = false,
}) {
  return (
    <section
      aria-label={label}
      data-focus-zone={zone}
      className="flex min-h-0 flex-col gap-2"
    >
      <h2 className="px-0.5 font-heading text-[10px] font-semibold uppercase tracking-widest text-muted">
        {label} ({entries.length})
      </h2>
      {entries.length === 0 ? (
        <p
          className={`${polished ? 'rounded-xl bg-card/40 px-3.5 py-2.5 shadow-sm' : 'rounded-lg bg-card/40 px-3 py-2'} border border-dashed border-line text-[11px] text-muted`}
        >
          {empty}
        </p>
      ) : (
        <>
          <ol
            className={`${compact || !zoneScroll ? '' : 'stage-rail-scroll '}flex flex-col gap-2`}
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
                    photographerAvailable={photographerAvailable}
                    polished={polished}
                  >
                    {entryBodies?.[key] ?? null}
                  </StageStepCard>
                </li>
              );
            })}
          </ol>
          {hiddenCount > 0 || expanded ? (
            <button
              type="button"
              data-focus-expander={zone}
              aria-expanded={expanded}
              onClick={onToggleExpanded}
              className={`self-start border px-3 py-1.5 text-[11px] font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-soft ${
                polished
                  ? 'rounded-xl border-panel-border bg-panel/60 shadow-sm backdrop-blur-sm transition hover:border-line-strong hover:bg-panel hover:shadow-md'
                  : 'rounded-lg border-line-strong bg-raised hover:bg-line'
              }`}
            >
              {expanded ? showLessLabel : showMoreLabel}
            </button>
          ) : null}
        </>
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
  zoneScroll = true,
  entryBodies = null,
  photographerAvailable = null,
  polished = false,
}) {
  const { t } = useI18n();
  const [openByZone, setOpenByZone] = useState({ history: null, future: null });
  const [expandedByZone, setExpandedByZone] = useState({ history: false, future: false });
  const stack = buildFocusStack(entries, activeIndex);
  const expandedStack = buildFocusStack(entries, activeIndex, {
    historyLimit: entries.length,
    futureLimit: entries.length,
  });

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

  const toggleExpanded = (zone) => {
    setExpandedByZone((prev) => ({ ...prev, [zone]: !prev[zone] }));
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
      <div className={`min-w-0 ${compact ? 'order-1' : 'order-2 lg:order-1'}`}>
        <FocusZone
          zone="history"
          label={copy.done}
          entries={expandedByZone.history ? expandedStack.history : stack.history}
          variant="done"
          empty={copy.noDone}
          openKey={openByZone.history}
          onToggle={toggle}
          onCollapse={() => collapse('history')}
          compact={compact}
          zoneScroll={zoneScroll}
          entryBodies={entryBodies}
          photographerAvailable={photographerAvailable}
          hiddenCount={stack.hidden.history}
          expanded={expandedByZone.history}
          onToggleExpanded={() => toggleExpanded('history')}
          showMoreLabel={t('mc.rail.showMore', { count: stack.hidden.history })}
          showLessLabel={t('mc.rail.showLess')}
          polished={polished}
        />
      </div>

      <div
        className={`min-w-0 ${
          compact ? 'order-2' : 'order-1 md:col-span-2 lg:col-span-1 lg:order-2'
        }`}
      >
        <section aria-label={copy.current} data-focus-zone="current" className="flex flex-col gap-2">
          <h2 className="px-0.5 font-heading text-[10px] font-semibold uppercase tracking-widest text-brand-soft">
            {copy.current}
          </h2>
          {stack.current ? (
            <CurrentStepTilt>
              <div
                className="relative"
                data-focus-card
                data-focus-depth="0"
                data-focus-opacity="1"
                data-focus-scale="1"
                style={{ zIndex: 30 }}
              >
                <StageStepCard
                  entry={stack.current}
                  variant="current"
                  photographerAvailable={photographerAvailable}
                  polished={polished}
                >
                  {entryBodies?.[stack.current.step?.id] ?? null}
                  {currentBody}
                </StageStepCard>
              </div>
            </CurrentStepTilt>
          ) : (
            <p className="rounded-xl border border-dashed border-line bg-card/40 px-3 py-6 text-center text-xs text-muted">
              {copy.noCurrent}
            </p>
          )}
        </section>
      </div>

      <div className="order-3 min-w-0">
        <FocusZone
          zone="future"
          label={copy.upcoming}
          entries={expandedByZone.future ? expandedStack.future : stack.future}
          variant={(_entry, position) => (position === 0 ? 'next' : 'later')}
          empty={copy.noUpcoming}
          openKey={openByZone.future}
          onToggle={toggle}
          onCollapse={() => collapse('future')}
          compact={compact}
          zoneScroll={zoneScroll}
          entryBodies={entryBodies}
          photographerAvailable={photographerAvailable}
          hiddenCount={stack.hidden.future}
          expanded={expandedByZone.future}
          onToggleExpanded={() => toggleExpanded('future')}
          showMoreLabel={t('mc.rail.showMore', { count: stack.hidden.future })}
          showLessLabel={t('mc.rail.showLess')}
          polished={polished}
        />
      </div>
    </section>
  );
}
