import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import SecondaryControlBar from '../../src/components/SecondaryControlBar.jsx';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #385 shared secondary control bar', () => {
  it('renders left, centered and right groups', () => {
    const html = renderToStaticMarkup(
      createElement(SecondaryControlBar, {
        left: createElement('span', null, 'LATE PIN SYNC'),
        center: createElement('span', null, 'Children expected'),
        right: createElement('span', null, 'THEME LANGUAGE PHONE'),
      }),
    );
    expect(html).toContain('LATE PIN SYNC');
    expect(html).toContain('Children expected');
    expect(html).toContain('THEME LANGUAGE PHONE');
  });

  it('renders nothing when all groups are empty', () => {
    expect(renderToStaticMarkup(createElement(SecondaryControlBar, {}))).toBe('');
  });

  it('places the controls below the MC top bar', () => {
    const mc = read('src/views/McMasterView.jsx');
    const topBarEnd = mc.indexOf('<SecondaryControlBar');
    expect(topBarEnd).toBeGreaterThan(mc.indexOf('<TopBarShell'));
    const bar = mc.slice(topBarEnd, mc.lastIndexOf('<HardAnchorAlertBanner'));
    expect(bar).toContain('<DriftPill');
    expect(bar).toContain('{pinControl}');
    expect(bar).toContain('{syncControl}');
    expect(bar).toContain('<ChildrenExpectedBadge');
    expect(bar).toContain('<OpenOnPhoneButton');
    expect(bar).toContain('utilityGroup');
  });

  it('removes the moved controls from the MC top bar', () => {
    const mc = read('src/views/McMasterView.jsx');
    const topBar = mc.slice(mc.indexOf('<TopBarShell'), mc.indexOf('<SecondaryControlBar'));
    expect(topBar).not.toContain('<DriftPill');
    expect(topBar).not.toContain('{pinControl}');
    expect(topBar).not.toContain('{syncControl}');
    expect(topBar).not.toContain('<OpenOnPhoneButton');
    expect(topBar).not.toContain('<LanguageToggle');
    expect(topBar).not.toContain('<ThemeToggle');
  });

  it('applies the bar to impacted role views', () => {
    for (const file of [
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/SpeakerView.jsx',
      'src/components/VenueManagerView.jsx',
    ]) {
      expect(read(file)).toContain('<SecondaryControlBar');
    }
  });

  it('places the photographer children badge in the bar and not in the pocket header', () => {
    const photo = read('src/components/PhotographerView.jsx');
    expect(photo).toContain('<ChildrenExpectedBadge');
    expect(photo).toContain('inline');
    expect(photo).not.toContain('fixed bottom-3 right-3');
    const bar = photo.slice(photo.indexOf('<SecondaryControlBar'), photo.indexOf('<main'));
    expect(bar).toContain('<ChildrenExpectedBadge');
    expect(read('src/components/RoleShell.jsx')).not.toContain('<ChildrenExpectedBadge');
  });

  it('keeps role-specific controls in their bars', () => {
    const dj = read('src/components/DjBoothView.jsx');
    expect(dj).toContain('{caps.vipAuth && authControl ? authControl : null}');
    expect(dj).toContain('<SyncStatusBadge');
    const speaker = read('src/components/SpeakerView.jsx');
    expect(speaker).toContain('<SecondaryControlBar');
    expect(speaker).toContain('<SyncStatusBadge');
  });
});
