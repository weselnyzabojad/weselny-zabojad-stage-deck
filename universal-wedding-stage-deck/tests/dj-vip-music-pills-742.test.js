import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MusicPolicyCard from '../src/components/MusicPolicyCard.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const policy = {
  hasData: true,
  requestStatus: null,
  cleanVersions: true,
  discoPoloPolicy: 'NO',
  mainSongs: [
    { id: 'main_1', stepId: 'step_08', stepTitle: 'First Dance', title: 'Perfect', artist: 'Ed Sheeran' },
    { id: 'main_2', stepId: 'step_05', stepTitle: 'Wedding cake', missing: true },
  ],
  mustPlay: [
    { id: 'must_1', track: 'Dancing Queen', linked: true, note: 'Bride’s mother', conflict: true },
  ],
  doNotPlay: [{ key: 'dont_1', track: 'Sto lat' }],
};

const render = (compact = false) =>
  renderToStaticMarkup(createElement(MusicPolicyCard, { policy, compact }));

describe('issue #742 DJ VIP music pills and Set notes placement', () => {
  it('renders every song list as compact wrapping pills on the laptop card', () => {
    const html = render();
    for (const value of [
      'First Dance',
      'Perfect',
      'Wedding cake',
      'Main song not set for this step.',
      'Dancing Queen',
      'Bride’s mother',
      'Sto lat',
    ]) {
      expect(html, value).toContain(value);
    }
    expect(html).toContain('flex flex-wrap gap-1.5');
    expect(html).toContain('rounded-full');
    expect(html).toContain('max-w-full');
    expect(html).not.toContain('space-y-1.5');
  });

  it('uses the same pills on the pocket card and keeps the counts', () => {
    const html = render(true);
    expect(html).toContain('2 main songs');
    expect(html).toContain('1 must play');
    expect(html).toContain('1 do not play');
    for (const value of ['Perfect', 'Wedding cake', 'Dancing Queen', 'Sto lat']) {
      expect(html, value).toContain(value);
    }
    expect(html).toContain('rounded-full');
  });

  it('keeps key-song, conflict, missing and do-not-play meaning', () => {
    const html = render();
    expect(html).toContain('Key song');
    expect(html).toContain('mustPlay track differs from the Key Songs entry');
    expect(html).toContain('Main song not set for this step.');
    expect(html).toContain('text-alert-tint');
  });

  it('places Set notes between the current step and Music Policy on the laptop', () => {
    const dj = read('src/components/DjBoothView.jsx');
    const main = dj.slice(dj.indexOf('<main id="main-content"'), dj.indexOf('</main>'));
    expect(main.indexOf("t('dj.setNotes')")).toBeLessThan(main.indexOf('<MusicPolicyCard'));
    expect(main.indexOf('<TimelineFocusStack')).toBeLessThan(main.indexOf("t('dj.setNotes')"));
    expect(main).not.toContain('<aside');
    expect(main).not.toContain('lg:col-span-2');
    expect(main).not.toContain('lg:grid-cols-3');
  });
});
