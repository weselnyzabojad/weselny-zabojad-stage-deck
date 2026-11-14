import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SpeakerView from '../../src/components/SpeakerView.jsx';
import RoleShell from '../../src/components/RoleShell.jsx';

const renderSpeaker = (childrenExpected) => renderToStaticMarkup(
  createElement(SpeakerView, {
    wedding: {
      weddingId: '2026-08-20_test',
      date: '20.08.2026',
      childrenExpected,
    },
    clock: { now: new Date('2026-08-20T18:00:00Z') },
    speechMode: 'OFF',
    speechCount: 0,
    activeSpeech: null,
    syncStatus: 'disabled',
  }),
);

describe('issue #523 Speaker children indicator removal', () => {
  it('renders no children indicator for true, false or absent values', () => {
    for (const value of [true, false, undefined]) {
      const html = renderSpeaker(value);
      expect(html, String(value)).not.toContain('Children expected');
      expect(html, String(value)).not.toContain('Children not expected');
      expect(html, String(value)).not.toContain('children');
    }
  });

  it('keeps the children indicator out of the pocket shell for every role', () => {
    for (const role of ['mc', 'speaker']) {
      const html = renderToStaticMarkup(
        createElement(RoleShell, {
          compact: true,
          role,
          wedding: { childrenExpected: true },
          theme: 'night',
          onToggleTheme: () => {},
        }),
      );
      expect(html, role).not.toContain('Children expected');
      expect(html, role).not.toContain('Children not expected');
    }
  });
});
