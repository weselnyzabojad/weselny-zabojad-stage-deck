import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SpeakerView from '../src/components/SpeakerView.jsx';

// Regression for the blank-screen crash: `SpeakerView` is imported by the app
// shell even when the current role is not speaker, so `t()` must only be used
// inside the component (where the hook exists), never at module scope.
describe('SpeakerView module load', () => {
  it('renders the speeches-off state without a module-scope t() crash', () => {
    const html = renderToStaticMarkup(
      createElement(SpeakerView, {
        wedding: { weddingId: '2026-08-20_test', date: '20.08.2026' },
        clock: { now: new Date('2026-08-20T18:00:00Z') },
        speechMode: 'OFF',
        speechCount: 0,
        activeSpeech: null,
        syncStatus: 'disabled',
      }),
    );
    expect(html).toContain('Speeches are off');
  });
});
