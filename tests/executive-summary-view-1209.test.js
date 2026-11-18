import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ClientExecutiveSummaryView from '../src/components/ClientExecutiveSummaryView.jsx';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const recap = {
  wedding: {
    couple: 'Jennifer & Guillaume',
    date: '20.08.2026',
    venue: 'Garden Venue',
  },
  summary: {
    actualEnd: '02:10',
    completedSteps: 5,
    totalSteps: 6,
    acceptedSongRequests: 3,
    animations: 5,
  },
  games: [
    {
      gameId: 'test_zgodnosci',
      title: 'Test Zgodności',
      totalQuestions: 3,
      questions: [
        { id: 'q1', text: 'Do you agree?', isCompatible: true },
        { id: 'q2', isCompatible: false },
      ],
    },
  ],
};

function render(props = {}) {
  return renderToStaticMarkup(
    createElement(ClientExecutiveSummaryView, {
      recap,
      onPrint: () => {},
      ...props,
    }),
  );
}

describe('issue #1209 client executive summary view', () => {
  it('renders the premium header metrics and print action', () => {
    const html = render();
    expect(html).toContain('Jennifer &amp; Guillaume');
    expect(html).toContain('20.08.2026');
    expect(html).toContain('Garden Venue');
    expect(html).toContain('02:10');
    expect(html).toContain('5/6');
    expect(html).toContain('3');
    expect(html).toContain('Print / Save PDF');
    expect(html).toContain('print:hidden');
  });

  it('renders the compatibility percentage, questions and fallback', () => {
    const html = render();
    expect(html).toContain('50% compatible');
    expect(html).toContain('2 of 3 answers');
    expect(html).toContain('Do you agree?');
    expect(html).toContain('Question 2');
    expect(html).toContain('✓ Compatible');
    expect(html).toContain('✕ Incompatible');
  });

  it('handles the no-answers state', () => {
    const html = render({ recap: { ...recap, games: [] } });
    expect(html).toContain('No compatibility answers were recorded.');
  });

  it('keeps print-safe cards and the existing recap sections', () => {
    const html = render();
    expect(html).toContain('recap-print-avoid');
    const page = read('src/components/WeddingRecapPage.jsx');
    expect(page).toContain('ClientExecutiveSummaryView');
    for (const key of [
      'recap.numbers.title',
      'recap.timeline.title',
      'recap.music.title',
      'recap.games.title',
      'recap.ceremony.title',
      'recap.vendors.title',
    ]) {
      expect(page).toContain(key);
    }
    const css = read('src/index.css');
    expect(css).toContain('@media print');
    expect(css).toContain('.recap-print-avoid');
    expect(css).toContain('break-inside: avoid');
  });

  it('keeps the executive copy in PL, EN and FR', () => {
    for (const locale of ['pl', 'en', 'fr']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of [
        'recap.executive.end',
        'recap.executive.completed',
        'recap.executive.accepted',
        'recap.compatibility.title',
        'recap.compatibility.percentage',
        'recap.compatibility.answered',
        'recap.compatibility.none',
        'recap.compatibility.questionFallback',
      ]) {
        expect(dict).toContain(`'${key}'`);
      }
    }
  });
});
