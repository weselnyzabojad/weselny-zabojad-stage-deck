import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HardAnchorAlertBanner from '../src/components/HardAnchorAlertBanner.jsx';
import RoleShell from '../src/components/RoleShell.jsx';
import StageStepCard from '../src/components/StageStepCard.jsx';
import TimelineFocusStack from '../src/components/TimelineFocusStack.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const render = (element) => renderToStaticMarkup(element);

function entry(index, overrides = {}) {
  return {
    index,
    step: {
      id: `step_${index}`,
      title: `Moment ${index}`,
      location: `Room ${index}`,
      type: 'FLEXIBLE',
      durationMin: 15,
      ...overrides.step,
    },
    isActive: false,
    isDone: false,
    projectedStart: `1${index}:00`,
    projectedEnd: `1${index}:15`,
    ...overrides,
  };
}

const timeline = (length, activeAt) =>
  Array.from({ length }, (_, index) =>
    entry(index, {
      isActive: index === activeAt,
      isDone: index < activeAt,
    }),
  );

describe('issue #713 MC Master content polish', () => {
  it('polishes DONE, upcoming and current cards only when requested', () => {
    const done = render(createElement(StageStepCard, { entry: entry(1), variant: 'done', polished: true }));
    expect(done).toContain('rounded-2xl');
    expect(done).toContain('bg-emerald-500/5');
    expect(done).toContain('border-tone-positive-border');

    const upcoming = render(createElement(StageStepCard, { entry: entry(2), variant: 'next', polished: true }));
    expect(upcoming).toContain('bg-amber-500/5');
    expect(upcoming).toContain('border-tone-warning-border');

    const current = render(createElement(StageStepCard, { entry: entry(3), variant: 'current', polished: true }));
    expect(current).toContain('shadow-lg');
    expect(current).toContain('border-brand-strong');

    const base = render(createElement(StageStepCard, { entry: entry(4), variant: 'done' }));
    expect(base).toContain('rounded-xl border p-3');
    expect(base).not.toContain('shadow-lg');
  });

  it('uses the soft secondary-button styling for Show N more', () => {
    const polished = render(
      createElement(TimelineFocusStack, {
        entries: timeline(7, 3),
        activeIndex: 3,
        polished: true,
      }),
    );
    expect(polished).toContain('data-focus-expander="history"');
    expect(polished).toContain('rounded-xl border-panel-border bg-panel/60');
    expect(polished).toContain('hover:shadow-md');

    const base = render(
      createElement(TimelineFocusStack, {
        entries: timeline(7, 3),
        activeIndex: 3,
      }),
    );
    expect(base).toContain('rounded-lg border-line-strong bg-raised');
  });

  it('hosts PIN/Sync/language/theme in the banner while it is visible', () => {
    const radar = {
      primary: {
        status: 'compression',
        label: 'Photo / Video leaves',
        time: '20:30',
        slackMinutes: 5,
        workEntry: { step: { title: 'Photo / Video leaves' }, projectedEnd: '20:30' },
      },
    };
    const html = render(
      createElement(HardAnchorAlertBanner, {
        radar,
        actions: createElement('span', null, 'PIN Sync Language Theme'),
      }),
    );
    expect(html).toContain('PIN Sync Language Theme');
    expect(html).toContain('backdrop-blur-md');
    expect(html).toContain('text-on-accent');

    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('actions={bannerActions}');
    const actions = mc.slice(mc.indexOf('const bannerActions = ('), mc.indexOf('const wideContent'));
    expect(actions).toContain('{pinControl}');
    expect(actions).toContain('{syncControl}');
    expect(actions).toContain('{utilityGroup}');
    expect(mc).toContain('{hasAnchorWarning ? null : utilityGroup}');
  });

  it('passes the polished variant to both MC focus stacks', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc.match(/<TimelineFocusStack[\s\S]*?polished/g)?.length).toBe(2);
  });

  it('refines the Notes, warning and checklist surfaces', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('border-tone-warning-border bg-tone-warning-bg');
    expect(mc).toContain('whitespace-pre-wrap break-words');
    expect(mc).toContain('rounded-2xl border border-panel-border bg-panel/40');
    expect(mc).toContain('hover:border-line-strong hover:bg-card/80 hover:shadow-sm');
  });

  it('fixes the pocket top overflow and keeps safe-area padding', () => {
    const shell = render(
      createElement(
        RoleShell,
        {
          compact: true,
          role: 'mc',
          syncStatus: 'connected',
          theme: 'night',
          onToggleTheme: () => {},
        },
        createElement('div', null, 'Pocket content'),
      ),
    );
    expect(shell).toContain('overflow-x-clip');
    expect(shell).toContain('pt-[calc(0.625rem+env(safe-area-inset-top))]');
    expect(shell).toContain('overflow-x-clip overflow-y-auto');
  });

  it('keeps the pocket cards on the polished focus stack', () => {
    const mc = read('src/views/McMasterView.jsx');
    const compactStack = mc.slice(
      mc.indexOf('<TimelineFocusStack'),
      mc.indexOf('/>', mc.indexOf('<TimelineFocusStack')),
    );
    expect(compactStack).toContain('compact');
    expect(compactStack).toContain('polished');
  });
});
