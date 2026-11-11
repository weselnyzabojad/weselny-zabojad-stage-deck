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

  it('renders the banner detail with the on-accent token', () => {
    const html = renderToStaticMarkup(
      createElement(HardAnchorAlertBanner, { radar }),
    );
    expect(html).toContain('text-on-accent');
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

  it('hosts PIN/Sync/language/theme actions inside the warning banner', () => {
    const mc = read('src/views/McMasterView.jsx');
    const banner = mc.slice(
      mc.lastIndexOf('<HardAnchorAlertBanner'),
      mc.indexOf('/>', mc.lastIndexOf('<HardAnchorAlertBanner')),
    );
    const actions = mc.slice(
      mc.indexOf('const bannerActions = ('),
      mc.indexOf('const wideContent'),
    );

    expect(banner).toContain('actions={bannerActions}');
    expect(actions).toContain('{pinControl}');
    expect(actions).toContain('{syncControl}');
    expect(actions).toContain('{utilityGroup}');
  });
});
