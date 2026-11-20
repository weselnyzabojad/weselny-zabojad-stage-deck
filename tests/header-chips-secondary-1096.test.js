import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));

const views = {
  mc: 'src/views/McMasterView.jsx',
  dj: 'src/components/DjBoothView.jsx',
  photo: 'src/components/PhotographerView.jsx',
  speaker: 'src/components/SpeakerView.jsx',
  venue: 'src/components/VenueManagerView.jsx',
};

describe('issue #1096 STATUS removal and secondary-bar chips', () => {
  it('deletes the shared STATUS menu and its i18n keys', () => {
    expect(exists('src/components/StatusMenu.jsx')).toBe(false);
    for (const locale of ['en', 'fr', 'pl']) {
      expect(read(`src/i18n/${locale}.js`)).not.toContain("'statusMenu.");
    }
  });

  it('removes STATUS from every role view', () => {
    for (const [view, path] of Object.entries(views)) {
      expect(read(path), view).not.toContain('StatusMenu');
    }
  });

  it('centres the cultural and speeches chips on MC, DJ and Photographer', () => {
    for (const view of ['mc', 'dj', 'photo']) {
      const source = read(views[view]);
      const start = source.indexOf('<SecondaryControlBar');
      const end = source.indexOf('right={(', start);
      const center = source.slice(start, end);
      expect(center, view).toContain('<CulturalRulesBar');
      expect(center, view).toContain('Speech');
    }
  });

  it('keeps the children badge standalone in the top-right zone', () => {
    for (const view of ['mc', 'dj', 'photo', 'venue']) {
      const source = read(views[view]);
      const topBar = source.slice(source.indexOf('<TopBarShell'), source.indexOf('<SecondaryControlBar'));
      expect(topBar, view).toContain('<ChildrenExpectedBadge');
      expect(topBar, view).toContain('inline');
    }
    expect(read(views.speaker)).not.toContain('<ChildrenExpectedBadge');
  });

  it('puts language and theme before Open on phone on every view', () => {
    for (const [view, path] of Object.entries(views)) {
      const source = read(path);
      const start = source.indexOf('<SecondaryControlBar');
      const bar = source.slice(start);
      const utilities = view === 'mc'
        ? bar.indexOf('{utilityGroup}')
        : bar.indexOf('<UtilityControlGroup');
      const phone = bar.indexOf('<OpenOnPhoneButton');
      expect(utilities, view).toBeGreaterThan(-1);
      expect(phone, view).toBeGreaterThan(-1);
      expect(utilities, view).toBeLessThan(phone);
    }
  });

  it('adds Open on phone for Venue Manager', () => {
    const venue = read(views.venue);
    expect(venue).toContain('<OpenOnPhoneButton role="venue_manager"');
    expect(venue).toContain('roomCode = null');
    const deck = read('src/StageDeck.jsx');
    const block = deck.slice(deck.indexOf('<VenueManagerView'), deck.indexOf('/>', deck.indexOf('<VenueManagerView')));
    expect(block).toContain('roomCode={deckIntent.roomCode}');
  });
});
