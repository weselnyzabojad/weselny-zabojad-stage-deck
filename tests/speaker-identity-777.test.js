import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SpeakerView from '../src/components/SpeakerView.jsx';

const baseProps = {
  wedding: { weddingId: 'w1' },
  clock: { now: new Date('2026-11-12T18:00:00Z'), timeZone: 'Europe/Warsaw' },
  speechMode: 'COMPLEX',
  speechCount: 1,
  syncStatus: 'connected',
};

describe('issue #777 speaker top bar active identity', () => {
  it('centers the active speaker name and relationship', () => {
    const html = renderToStaticMarkup(
      createElement(SpeakerView, {
        ...baseProps,
        activeSpeech: {
          id: 'speech_witness',
          speaker: { name: 'Bartek', relationship: 'Best man' },
          speakerVisible: true,
          scriptAllowed: true,
          script: { text: 'Hello', redactions: [] },
        },
      }),
    );
    expect(html).toContain('Bartek');
    expect(html).toContain('Best man');
    expect(html).toContain('aria-label="Now speaking: Bartek · Best man"');
  });

  it('omits the identity when no speech is active', () => {
    const html = renderToStaticMarkup(
      createElement(SpeakerView, { ...baseProps, activeSpeech: null }),
    );
    expect(html).not.toContain('Now speaking:');
  });
});
