import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PostMortemAnalytics from '../src/components/PostMortemAnalytics.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const steps = [
  { id: 'a', time: '18:00', title: 'Arrival' },
  { id: 'b', time: '19:00', title: 'Dinner' },
  { id: 'c', time: '20:00', title: 'Closure', mandatory: { kind: 'CLOSURE' } },
];

function render(props = {}) {
  return renderToStaticMarkup(
    createElement(PostMortemAnalytics, {
      open: true,
      onClose: () => {},
      steps,
      liveState: {
        actual_timestamps: { a: '18:07', b: '19:12', c: '20:10' },
      },
      closureTime: '23:00',
      ...props,
    }),
  );
}

describe('issue #1191 post-mortem timing dashboard', () => {
  it('renders the summary and every timing row', () => {
    const html = render();
    expect(html).toContain('data-testid="post-mortem-analytics"');
    expect(html).toContain('Timing post-mortem');
    expect(html).toContain('Arrival');
    expect(html).toContain('Dinner');
    expect(html).toContain('Closure');
    expect(html).toContain('+7 min');
    expect(html).toContain('+12 min');
    expect(html).toContain('+10 min');
    expect(html).toContain('29 min');
  });

  it('renders planned and actual bars on a shared axis', () => {
    const html = render();
    expect(html).toContain('role="img"');
    expect(html).toContain('Planned: Arrival');
    expect(html).toContain('Actual: Arrival');
    expect(html).toContain('style="left:');
    expect(html).toContain('width:');
  });

  it('renders early and missing badges', () => {
    const html = render({
      liveState: { actual_timestamps: { a: '17:50', b: null } },
    });
    expect(html).toContain('−10 min');
    expect(html).toContain('Missing');
    expect(html).toContain('border-sky-800');
    expect(html).toContain('border-line bg-raised text-muted');
  });

  it('shows a safe empty state when no actual timestamps exist', () => {
    const html = render({ liveState: { actual_timestamps: {} } });
    expect(html).toContain('No timing data yet.');
    expect(html).not.toContain('+7 min');
  });

  it('is gated to the completed MC surface', () => {
    const view = read('src/views/McMasterView.jsx');
    expect(view).toContain('PostMortemAnalytics');
    expect(view).toContain('postMortemControl');
    expect(view).toContain('isComplete ? (');
    expect(view).toContain("t('postMortem.open')");
    expect(view).toContain('liveState={liveState}');
  });

  it('keeps the dashboard copy in PL, EN and FR', () => {
    for (const locale of ['pl', 'en', 'fr']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of [
        'postMortem.open',
        'postMortem.title',
        'postMortem.summary.total',
        'postMortem.summary.onTime',
        'postMortem.summary.late',
        'postMortem.summary.early',
        'postMortem.summary.missing',
        'postMortem.empty',
        'postMortem.plannedAria',
        'postMortem.actualAria',
      ]) {
        expect(dict).toContain(`'${key}'`);
      }
    }
  });
});
