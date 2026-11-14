import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SpeechSummaryChip from '../src/components/SpeechSummaryChip.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const speech = {
  id: 'speech_witness',
  order: 2,
  speaker: { name: 'Bartek', relationship: 'Best man' },
  script: { ready: true, entry: { ciphertext: 'secret' } },
};

describe('issue #928 non-MC speech summary', () => {
  it('shows speaker names and relationships without script or live state', () => {
    const html = renderToStaticMarkup(
      createElement(SpeechSummaryChip, { mode: 'COMPLEX', speeches: [speech], dense: true }),
    );
    expect(html).toContain('Bartek');
    expect(html).toContain('Best man');
    expect(html).toContain('<details');
    expect(html).toContain('<summary');
    expect(html).not.toContain('Live');
    expect(html).not.toContain('ciphertext');
    expect(html).not.toContain('secret');
    expect(html).not.toContain('PIN');
  });

  it('hides the summary when speeches are OFF', () => {
    const html = renderToStaticMarkup(
      createElement(SpeechSummaryChip, { mode: 'OFF', speeches: [speech] }),
    );
    expect(html).toBe('');
  });

  it('renders an empty state rather than a broken chip', () => {
    const html = renderToStaticMarkup(
      createElement(SpeechSummaryChip, { mode: 'LIGHT', speeches: [] }),
    );
    expect(html).toContain('<details');
    expect(html).toContain('summary');
  });

  it('wires the summary into DJ, photo and venue views', () => {
    expect(read('src/components/DjBoothView.jsx')).toContain('<SpeechSummaryChip');
    expect(read('src/components/PhotographerView.jsx')).toContain('<SpeechSummaryChip');
    expect(read('src/components/VenueManagerView.jsx')).toContain('<SpeechSummaryChip');
    expect(read('src/components/RoleShell.jsx')).toContain('<SpeechSummaryChip');
    expect(read('src/StageDeck.jsx')).toContain('summarySpeeches');
  });

  it('uses the bundle projection for summary roles', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain("currentRole === 'dj'");
    expect(deck).toContain("currentRole === 'venue_manager'");
    expect(deck).toContain('speechBundleRole');
    expect(deck).toContain('speeches={summarySpeeches}');
    expect(read('src/hooks/useSpeechBundle.js')).toContain('fetchSpeechList');
  });

  it('never exposes scripts or translations from the summary chip', () => {
    const chip = read('src/components/SpeechSummaryChip.jsx');
    expect(chip).not.toContain('speech.script');
    expect(chip).not.toContain('pair.translation');
    expect(chip).not.toContain('liveSpeechId');
    expect(chip).not.toContain('pin');
    expect(chip).toContain('speech.speaker?.name');
    expect(chip).toContain('speech.speaker?.relationship');
  });

  it('keeps the copy complete in PL, EN and FR', () => {
    for (const locale of ['pl', 'en', 'fr']) {
      const dict = read(`src/i18n/${locale}.js`);
      expect(dict).toContain("'speeches.summaryTitle'");
      expect(dict).toContain("'speeches.summaryEmpty'");
    }
  });
});
