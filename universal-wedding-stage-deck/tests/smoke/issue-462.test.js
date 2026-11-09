import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DiscoPoloBadge from '../../src/components/DiscoPoloBadge.jsx';
import MusicPolicyCard from '../../src/components/MusicPolicyCard.jsx';
import DjSongRequestQueue from '../../src/components/DjSongRequestQueue.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const render = (element) => renderToStaticMarkup(element);
const policy = (value) => ({
  hasData: true,
  mustPlay: [],
  doNotPlay: [],
  mainSongs: [],
  requestStatus: null,
  cleanVersions: null,
  ...(value ? { discoPoloPolicy: value } : {}),
});

describe('issue #462 DJ VIP Disco Polo policy display', () => {
  it('renders red, green and amber states with text and accessible descriptions', () => {
    const no = render(createElement(DiscoPoloBadge, { value: 'NO' }));
    expect(no).toContain('Disco Polo: Strictly forbidden');
    expect(no).toContain('border-red-600');
    expect(no).toContain('No Disco Polo songs tonight.');

    const yes = render(createElement(DiscoPoloBadge, { value: 'YES' }));
    expect(yes).toContain('Disco Polo: Allowed');
    expect(yes).toContain('border-emerald-600');

    const onRequest = render(createElement(DiscoPoloBadge, { value: 'ON_REQUEST' }));
    expect(onRequest).toContain('Disco Polo: Guest request only — one song');
    expect(onRequest).toContain('border-amber-600');
    expect(onRequest).toContain('only when a guest requests it');
  });

  it('fails closed to NO for missing or invalid values', () => {
    expect(render(createElement(DiscoPoloBadge, {}))).toContain('Strictly forbidden');
    expect(render(createElement(DiscoPoloBadge, { value: 'MAYBE' }))).toContain(
      'Strictly forbidden',
    );
  });

  it('shows the policy in the Music Policy card', () => {
    expect(render(createElement(MusicPolicyCard, { policy: policy('ON_REQUEST') }))).toContain(
      'Guest request only',
    );
    expect(render(createElement(MusicPolicyCard, { policy: policy() }))).toContain(
      'Strictly forbidden',
    );
  });

  it('shows the policy in the disconnected DJ VIP request bar', () => {
    const html = render(
      createElement(DjSongRequestQueue, {
        enabled: true,
        variant: 'bar',
        role: 'dj',
        roomCode: 'abc123',
        discoPoloPolicy: 'YES',
      }),
    );
    expect(html).toContain('Disco Polo: Allowed');
    expect(html).toContain('Song&#x27;s request QR');
  });

  it('passes the cartridge value only to the DJ VIP surfaces', () => {
    const dj = read('src/components/DjBoothView.jsx');
    expect((dj.match(/discoPoloPolicy=\{musicPolicy\?\.discoPoloPolicy \?\? 'NO'\}/g) ?? []).length).toBe(2);
    expect(dj).toContain('{isVip ? <MusicPolicyCard policy={musicPolicy} /> : null}');
    expect(dj).toContain('{isVip ? (');
  });

  it('localizes all states, descriptions and the one-song rule', () => {
    for (const file of ['src/i18n/en.js', 'src/i18n/fr.js', 'src/i18n/pl.js']) {
      const source = read(file);
      for (const key of [
        'music.discoPolo.NO',
        'music.discoPolo.YES',
        'music.discoPolo.ON_REQUEST',
        'music.discoPolo.description.NO',
        'music.discoPolo.description.YES',
        'music.discoPolo.description.ON_REQUEST',
      ]) {
        expect(source, `${file} ${key}`).toContain(`'${key}'`);
      }
    }
  });
});
