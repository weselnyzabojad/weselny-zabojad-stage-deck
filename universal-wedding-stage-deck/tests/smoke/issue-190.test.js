import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HardAnchorAlertBanner from '../../src/components/HardAnchorAlertBanner.jsx';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const radar = {
  primary: {
    status: 'compression',
    label: 'Photo / Video leaves',
    time: '20:30',
    slackMinutes: 5,
    workEntry: {
      step: { title: 'Photo / Video leaves' },
      projectedEnd: '20:30',
    },
  },
};

describe('issue #190 PIN and Sync in the hard-anchor banner', () => {
  it('renders right-side actions inside the banner', () => {
    const html = renderToStaticMarkup(
      createElement(HardAnchorAlertBanner, {
        radar,
        actions: createElement('span', { 'data-testid': 'banner-actions' }, 'PIN + Sync'),
      }),
    );

    expect(html).toContain('Photo / Video leaves');
    expect(html).toContain('20:30');
    expect(html).toContain('5m slack');
    expect(html).toContain('banner-actions');
    expect(html).toContain('PIN + Sync');
  });

  it('renders the banner detail in white', () => {
    const html = renderToStaticMarkup(
      createElement(HardAnchorAlertBanner, { radar }),
    );
    expect(html).toContain('text-white');
    expect(html).not.toContain('opacity-90');
  });

  it('moves PIN and Sync out of the top bar while a warning is visible', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('const hasAnchorWarning = driftReport.hardAnchorRadar.hasWarning');
    expect(mc).toContain('{hasAnchorWarning ? null : (');
    expect(mc).toContain('actions={(');
    expect(mc).toContain('{pinControl}');
    expect(mc).toContain('{syncControl}');
  });

  it('keeps a top-bar fallback when no warning is present', () => {
    const mc = read('src/views/McMasterView.jsx');
    const fallback = mc.slice(
      mc.indexOf('{hasAnchorWarning ? null : ('),
      mc.indexOf('<OpenOnPhoneButton role={currentRole}'),
    );
    expect(fallback).toContain('{pinControl}');
    expect(fallback).toContain('{syncControl}');
  });
});
