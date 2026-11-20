import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DjSetCountdown } from '../../src/components/DjBoothView.jsx';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const wedding = { dateISO: '2026-08-20' };
const render = (nowIso, projectedStart = '20:10') =>
  renderToStaticMarkup(
    createElement(DjSetCountdown, {
      wedding,
      clock: { now: new Date(nowIso), timeZone: 'UTC' },
      nextEntry: { projectedStart, step: { title: 'First Dance' } },
    }),
  );

describe('issue #614 DJ VIP DJ-set countdown', () => {
  it('counts down to the next step', () => {
    const html = render('2026-08-20T20:00:00.000Z');
    expect(html).toContain('Next step in');
    expect(html).toContain('10:00');
    expect(html).not.toContain('animate-pulse');
  });

  it('turns red and blinks at six minutes or less', () => {
    const six = render('2026-08-20T20:04:00.000Z');
    expect(six).toContain('6:00');
    expect(six).toContain('animate-pulse');
    expect(six).toContain('border-alert');
    expect(six).toContain('motion-reduce:animate-none');
  });

  it('renders nothing without a next step', () => {
    const html = renderToStaticMarkup(
      createElement(DjSetCountdown, {
        wedding,
        clock: { now: new Date('2026-08-20T20:00:00.000Z'), timeZone: 'UTC' },
        nextEntry: null,
      }),
    );
    expect(html).toBe('');
  });

  it('is gated to VIP and a DJ-set current step', () => {
    const source = read('src/components/DjBoothView.jsx');
    expect(source).toContain("activeEntry?.step?.optionalFlag === 'dj_set'");
    expect(source).toContain('caps.vip && isDjSet && nextEntry');
  });
});
