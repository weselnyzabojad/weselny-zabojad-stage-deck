import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TopBarRoleIdentity from '../../src/components/TopBarRoleIdentity.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #446 photo sunset and role label i18n', () => {
  it('routes sunset/light-window chrome through t()', () => {
    const photo = read('src/components/PhotographerView.jsx');
    for (const key of [
      'photo.lightWindows',
      'photo.sunsetGolden',
      'photo.sunset',
      'photo.goldenHour',
      'photo.civilTwilight',
      'photo.miniLatestStart',
      'photo.miniSessionLatestStart',
      'photo.sunsetUnavailable',
      'photo.offlineExplainCompact',
      'photo.offlineExplain',
      'photo.stale',
      'photo.fetched',
      'photo.miniSession',
      'photo.backupLocation',
      'photo.locationTbc',
      'photo.venueTimezone',
      'photo.source',
      'photo.in',
      'photo.ago',
      'photo.chosenMiniHour',
      'photo.saveForAllMedia',
      'photo.sharedOverride',
      'photo.unscheduled',
    ]) {
      expect(photo, key).toContain(key);
    }
    expect(photo).not.toContain('Sunset & golden hour');
    expect(photo).not.toContain('Sunset unavailable — check connection.');
    expect(photo).not.toContain('Chosen mini-session hour');
  });

  it('removes the broken leading glyph from the sunset title', () => {
    const photo = read('src/components/PhotographerView.jsx');
    expect(photo).not.toContain('Ы');
  });

  it('renders the same number-free top-bar label for both photographers', () => {
    const photo1 = renderToStaticMarkup(createElement(TopBarRoleIdentity, { role: 'photo1' }));
    const photo2 = renderToStaticMarkup(createElement(TopBarRoleIdentity, { role: 'photo2' }));
    const video = renderToStaticMarkup(createElement(TopBarRoleIdentity, { role: 'video' }));
    expect(photo1).toContain('Role: Photo');
    expect(photo2).toContain('Role: Photo');
    expect(photo1).toBe(photo2);
    expect(video).toContain('Role: Camera');
  });

  it('defines every key in all locales', () => {
    const keys = [
      'photo.lightWindows',
      'photo.sunsetGolden',
      'photo.sunset',
      'photo.goldenHour',
      'photo.civilTwilight',
      'photo.miniLatestStart',
      'photo.miniSessionLatestStart',
      'photo.sunsetUnavailable',
      'photo.offlineExplainCompact',
      'photo.offlineExplain',
      'photo.stale',
      'photo.fetched',
      'photo.miniSession',
      'photo.backupLocation',
      'photo.locationTbc',
      'photo.venueTimezone',
      'photo.source',
      'photo.in',
      'photo.ago',
      'photo.chosenMiniHour',
      'photo.saveForAllMedia',
      'photo.sharedOverride',
      'photo.unscheduled',
    ];
    for (const locale of ['en', 'fr', 'pl']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of keys) {
        expect(dict, `${locale}:${key}`).toContain(`'${key}'`);
      }
    }
  });
});
