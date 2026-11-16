import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { setLocale } from '../src/i18n/index.js';
import CeremonySubSteps from '../src/components/CeremonySubSteps.jsx';
import { ceremonySubStepBodies } from '../src/components/ceremonySubStepBodies.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const fullRows = [
  {
    id: 'ceremony_entrance',
    time: '17:00',
    title: 'Bridal entrance',
    notes: 'Doors open; guests stand.',
    musicCue: 'Canon in D',
    responsibleRole: 'Musician',
  },
  {
    id: 'ceremony_vows',
    time: '17:15',
    title: 'Vows',
    notes: 'Microphones for the couple.',
    responsibleRole: 'MC',
  },
];

const render = (subSteps) =>
  renderToStaticMarkup(createElement(CeremonySubSteps, { subSteps }));

afterEach(() => {
  setLocale('en', { persist: false });
});

describe('issue #1113 Ceremony sub-steps on MC, DJ VIP and Musician views', () => {
  it('renders a collapsed Ceremony-parts expander with full detail', () => {
    const html = render(fullRows);
    expect(html).toContain('<details');
    expect(html).not.toContain('<details open');
    expect(html).toContain('Ceremony parts (2)');
    expect(html).toContain('17:00');
    expect(html).toContain('Bridal entrance');
    expect(html).toContain('Doors open; guests stand.');
    expect(html).toContain('Music cue');
    expect(html).toContain('Canon in D');
    expect(html).toContain('Musician');
  });

  it('hides absent optional fields and keeps Doc row order', () => {
    const html = render([
      { id: 'a', title: 'First' },
      { id: 'b', title: 'Second', responsibleRole: 'MC' },
    ]);
    expect(html).not.toContain('Music cue');
    expect(html.indexOf('First')).toBeLessThan(html.indexOf('Second'));
    expect(html).not.toContain('>undefined<');
    expect(html).not.toContain('>null<');
  });

  it('localizes the expander, labels and responsible roles', () => {
    setLocale('pl', { persist: false });
    const pl = render(fullRows);
    expect(pl).toContain('Części ceremonii (2)');
    expect(pl).toContain('Wskazówka muzyczna');
    expect(pl).toContain('Muzyk');
    expect(pl).toContain('MC');

    setLocale('fr', { persist: false });
    const fr = render(fullRows);
    expect(fr).toContain('Parties de la cérémonie (2)');
    expect(fr).toContain('Repère musical');
    expect(fr).toContain('Musicien');
  });

  it('builds bodies only for steps that carry Ceremony sub-steps', () => {
    const bodies = ceremonySubStepBodies([
      { step: { id: 'step_ceremony', ceremony: { subSteps: fullRows } } },
      { step: { id: 'step_dinner' } },
      { step: { id: 'step_empty', ceremony: { subSteps: [] } } },
    ]);
    expect(Object.keys(bodies)).toEqual(['step_ceremony']);
    expect(renderToStaticMarkup(bodies.step_ceremony)).toContain('Ceremony parts (2)');
  });

  it('wires the bodies into MC, DJ VIP and Musician only', () => {
    const mc = read('src/views/McMasterView.jsx');
    const dj = read('src/components/DjBoothView.jsx');
    const musician = read('src/components/MusicianView.jsx');
    expect(mc.match(/entryBodies=\{ceremonySubStepBodies\(railEntries\)\}/g)).toHaveLength(2);
    expect(dj.match(/entryBodies=\{caps\.vip \? ceremonySubStepBodies\(timeline\) : null\}/g)).toHaveLength(2);
    expect(musician).toContain('entryBodies={ceremonySubStepBodies(timeline)}');
  });

  it('ships every new string in en, fr and pl', () => {
    for (const file of ['src/i18n/en.js', 'src/i18n/fr.js', 'src/i18n/pl.js']) {
      const source = read(file);
      for (const key of [
        'ceremony.subSteps.title',
        'ceremony.subSteps.listLabel',
        'ceremony.subSteps.musicCue',
        'ceremony.subSteps.role.MC',
        'ceremony.subSteps.role.DJ',
        'ceremony.subSteps.role.Musician',
        'ceremony.subSteps.role.Speaker',
        'ceremony.subSteps.role.Venue',
      ]) {
        expect(source, `${file} ${key}`).toContain(`'${key}'`);
      }
    }
  });
});
