import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DjSetNotesNotepad from '../src/components/DjSetNotesNotepad.jsx';
import MusicPolicyCard from '../src/components/MusicPolicyCard.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const render = (element) => renderToStaticMarkup(element);

const policy = {
  hasData: true,
  requestStatus: null,
  cleanVersions: true,
  discoPoloPolicy: 'ON_REQUEST',
  mainSongs: [
    { id: 'main_1', stepId: 'step_08', stepTitle: 'First Dance', title: 'Perfect', artist: 'Ed Sheeran' },
  ],
  mustPlay: [{ id: 'must_1', track: 'Dancing Queen', linked: true, note: 'Bride', conflict: false }],
  doNotPlay: [{ key: 'dont_1', track: 'Sto lat' }],
};

describe('issue #1085 DJ set-notes notepad', () => {
  it('renders the paper shell, ruled lines and punched binding', () => {
    const html = render(createElement(DjSetNotesNotepad, { policy }));
    expect(html).toContain('data-testid="dj-set-notes-notepad"');
    expect(html).toContain('#FDFBF7');
    expect(html).toContain('repeating-linear-gradient');
    expect(html).toContain('border-dashed');
    expect(html).toContain('aria-hidden="true"');
  });

  it('keeps the bold header and handwriting notes on the paper', () => {
    const html = render(createElement(DjSetNotesNotepad, { policy }));
    expect(html).toContain('Set notes');
    expect(html).toContain('font-handwriting');
    expect(html).toContain('leading-6');
    expect(html).toContain('Follow the projected times');
  });

  it('places the full Music Policy inside the notepad on paper', () => {
    const html = render(createElement(DjSetNotesNotepad, { policy }));
    expect(html).toContain('Music policy');
    expect(html).toContain('Disco Polo: Guest request only');
    expect(html).toContain('Sto lat');
    expect(html).toContain('Perfect');
    expect(html).toContain('bg-[#efe2c8]');
    expect(html).toContain('bg-[#f7ddd7]');
  });

  it('renders the default Music Policy card unchanged for MC and compact', () => {
    const html = render(createElement(MusicPolicyCard, { policy }));
    expect(html).toContain('bg-card/95');
    expect(html).not.toContain('bg-[#efe2c8]');
  });

  it('uses the notepad only in the wide DJ VIP layout', () => {
    const dj = read('src/components/DjBoothView.jsx');
    const compact = dj.slice(dj.indexOf('const compactContent'), dj.indexOf('const wideContent'));
    const wide = dj.slice(dj.indexOf('const wideContent'), dj.indexOf('if (!isCompact)'));

    expect(compact).toContain('<MusicPolicyCard policy={musicPolicy} />');
    expect(compact).not.toContain('DjSetNotesNotepad');
    expect(wide).toContain('<DjSetNotesNotepad policy={musicPolicy} />');
    expect(wide).not.toContain('<MusicPolicyCard policy={musicPolicy} />');
    expect(dj).toContain("import DjSetNotesNotepad from './DjSetNotesNotepad'");
  });

  it('loads Caveat through the existing font link and theme token', () => {
    const html = read('index.html');
    expect(html).toContain('family=Caveat');
    expect(read('src/index.css')).toContain('--font-handwriting: "Caveat"');
  });
});
