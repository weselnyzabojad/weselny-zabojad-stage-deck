import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DjSetNotesNotepad from '../src/components/DjSetNotesNotepad.jsx';
import MusicPolicyCard from '../src/components/MusicPolicyCard.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const policy = {
  hasData: true,
  mainSongs: [],
  mustPlay: [],
  doNotPlay: [],
  requestStatus: null,
  discoPoloPolicy: 'NO',
};

describe('issue #1138 DJ VIP Music Policy placement', () => {
  it('keeps Music Policy out of VIP Set notes and leaves DJ Standard unchanged', () => {
    const withoutPolicy = renderToStaticMarkup(
      createElement(DjSetNotesNotepad, { policy, showPolicy: false }),
    );
    expect(withoutPolicy).not.toContain('Music policy');
    expect(withoutPolicy).not.toContain('music-policy-title');
    expect(withoutPolicy).toContain('Set notes');

    const standard = renderToStaticMarkup(
      createElement(DjSetNotesNotepad, { policy, showPolicy: true }),
    );
    expect(standard).toContain('Music policy');
  });

  it('renders the policy card in a bare panel variant', () => {
    const html = renderToStaticMarkup(
      createElement(MusicPolicyCard, { policy, panel: true, showLists: false }),
    );
    expect(html).toContain('music-policy-title');
    expect(html).not.toContain('rounded-xl border border-line bg-card/95');
  });

  it('places the soft policy panel below Musician’s preferred music', () => {
    const dj = read('src/components/DjBoothView.jsx');
    const future = dj.slice(dj.indexOf('const futureFooter'), dj.indexOf('const currentColumnFooter'));
    const policyIndex = future.indexOf('<MusicianPreferredMusic');
    const movedPolicyIndex = future.indexOf('<MusicPolicyCard policy={musicPolicy} panel');
    expect(policyIndex).toBeGreaterThan(-1);
    expect(movedPolicyIndex).toBeGreaterThan(policyIndex);
    expect(future).toContain('<DjPolicyPanel label={t(\'music.title\')}>');
    expect(future).toContain('musicPolicy?.hasData');

    const current = dj.slice(dj.indexOf('const currentColumnFooter'), dj.indexOf('// Extra current-card'));
    expect(current).toContain('<DjSetNotesNotepad policy={musicPolicy} showPolicy={!caps.vip} />');
    expect(dj).toContain('<MusicPolicyCard policy={musicPolicy} />');
  });
});
