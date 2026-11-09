import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SpeakerView from '../../src/components/SpeakerView.jsx';

const render = (activeSpeech) => renderToStaticMarkup(
  createElement(SpeakerView, {
    wedding: { weddingId: '2026-08-20_test', date: '20.08.2026' },
    clock: { now: new Date('2026-08-20T18:00:00Z') },
    speechMode: 'AUTO',
    speechCount: 1,
    activeSpeech,
    syncStatus: 'disabled',
  }),
);

const speech = (overrides = {}) => ({
  speakerVisible: true,
  scriptAllowed: true,
  speaker: { name: 'Bartek', relationship: 'Best man' },
  script: { text: 'First paragraph.\n\nSecond paragraph.' },
  ...overrides,
});

describe('issue #450 speaker identity line and primary script', () => {
  it('renders name and relationship on one line without the visible Now speaking label', () => {
    const html = render(speech());
    expect(html).toContain('Bartek');
    expect(html).toContain('Best man');
    expect(html).not.toMatch(/>Now speaking</);
    expect(html).toContain('aria-label="Now speaking"');
  });

  it('renders only the name when the relationship is missing', () => {
    const html = render(speech({ speaker: { name: 'Bartek' } }));
    expect(html).toContain('Bartek');
    expect(html).not.toContain('Best man');
  });

  it('keeps paragraphs and gives the script the dominant type size', () => {
    const html = render(speech());
    expect(html).toContain('First paragraph.\n\nSecond paragraph.');
    expect(html).toContain('whitespace-pre-wrap');
    expect(html).toContain('text-xl');
    expect(html).toContain('lg:text-3xl');
    expect(html).toContain('break-words');
  });

  it('keeps the missing-script state', () => {
    const html = render(speech({ script: { text: '' } }));
    expect(html).toContain('Script not provided yet');
    expect(html).toContain('Check with the MC');
  });
});
