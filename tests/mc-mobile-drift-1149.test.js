import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DriftPill from '../src/components/DriftPill.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const render = (drift, props = {}) =>
  renderToStaticMarkup(createElement(DriftPill, { drift, ...props }));

const late = {
  canonicalDriftTone: 'late',
  canonicalDriftLabel: '+127052 min OPÓŹNIENIA',
  canonicalDriftMinutes: 127052,
};

describe('issue #1149 mobile MC delay badge', () => {
  it('uses the laptop light-pink/red negative tone on the compact pill', () => {
    const html = render(late, { compact: true });
    expect(html).toContain('bg-tone-negative-bg');
    expect(html).toContain('border-tone-negative-border');
    expect(html).toContain('text-tone-negative-text');
    expect(html).not.toContain('bg-red-500');
    expect(html).not.toContain('border-black');
    expect(html).not.toContain('text-black');
  });

  it('renders a compact rounded pill instead of a heavy bordered block', () => {
    const html = render(late, { compact: true });
    expect(html).toContain('rounded-full');
    expect(html).toContain('border');
    expect(html).not.toContain('border-2');
    expect(html).toContain('px-2.5');
    expect(html).toContain('py-1');
    expect(html).toContain('text-xs');
  });

  it('shows only the delay value without OPÓŹNIENIA', () => {
    const html = render(late, { compact: true });
    expect(html).toContain('▲');
    expect(html).toContain('+127052 min');
    expect(html).not.toContain('OPÓŹNIENIA');
    expect(html).not.toContain('127052 min OPÓŹNIENIA');
  });

  it('keeps the laptop pill and other compact states unchanged', () => {
    const desktop = render(late);
    expect(desktop).toContain('rounded-2xl');
    expect(desktop).toContain('bg-tone-negative-bg');
    expect(desktop).not.toContain('border-2');

    const onTime = render(
      {
        canonicalDriftTone: 'ontime',
        canonicalDriftLabel: 'ON TIME',
        canonicalDriftMinutes: 0,
      },
      { compact: true },
    );
    expect(onTime).toContain('bg-emerald-400');
    expect(onTime).toContain('border-2');
    expect(onTime).toContain('rounded');
    expect(onTime).not.toContain('bg-tone-positive-bg');
  });

  it('keeps the badge mounted in the compact MC view', () => {
    const view = read('src/views/McMasterView.jsx');
    expect(view).toContain('<DriftPill drift={driftReport.drift} compact />');
  });
});
