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

  it('moves PIN and Sync into the secondary control bar', () => {
    const mc = read('src/views/McMasterView.jsx');
    expect(mc).toContain('<SecondaryControlBar');
    expect(mc).toContain('{pinControl}');
    expect(mc).toContain('{syncControl}');
    const topBar = mc.slice(
      mc.indexOf('<TopBarShell'),
      mc.indexOf('<SecondaryControlBar'),
    );
    expect(topBar).not.toContain('{pinControl}');
    expect(topBar).not.toContain('{syncControl}');
  });

  it('no longer renders PIN/Sync actions inside the warning banner', () => {
    const mc = read('src/views/McMasterView.jsx');
    const banner = mc.slice(
      mc.indexOf('<HardAnchorAlertBanner'),
      mc.indexOf('/>', mc.indexOf('<HardAnchorAlertBanner')),
    );
    expect(banner).not.toContain('actions={(');
    expect(banner).not.toContain('{pinControl}');
    expect(banner).not.toContain('{syncControl}');
  });
});
