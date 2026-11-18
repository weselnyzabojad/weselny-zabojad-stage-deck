import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BilingualScriptViewer from '../src/components/BilingualScriptViewer.jsx';
import { scriptHighlightClass } from '../src/lib/speechReadAlong.js';

const blocks = [
  { id: 'b1', langA_text: 'Bonjour Élodie, comment allez-vous ?', langB_text: 'Dzień dobry Elodie, jak się masz?' },
  { id: 'b2', langA_text: 'Merci beaucoup.', langB_text: 'Dziękuję bardzo.' },
];

function text(html) {
  return html.replace(/<[^>]+>/g, '');
}

function render(props = {}) {
  return renderToStaticMarkup(
    createElement(BilingualScriptViewer, {
      scriptBlocks: blocks,
      languageA: 'FR',
      languageB: 'PL',
      title: 'Speech',
      ...props,
    }),
  );
}

describe('issue #1173 BilingualScriptViewer', () => {
  it('renders the viewer, title, both language labels and interleaved blocks', () => {
    const html = render();
    expect(html).toContain('data-testid="bilingual-script-viewer"');
    expect(html).toContain('Speech');
    expect(html).toContain('FR');
    expect(html).toContain('PL');
    expect(html).toContain('script-marker-a');
    expect(html).toContain('script-marker-b');
    expect(text(html)).toContain('Bonjour Élodie');
    expect(text(html)).toContain('Dzień dobry Elodie');
    expect(text(html)).toContain('Merci beaucoup.');
    expect(text(html)).toContain('Dziękuję bardzo.');
  });

  it('splits only the tracked language into word spans', () => {
    const html = render();
    expect(html).toContain('<span');
    expect(html).toContain('class="text-ink"');
    expect(html).toContain('aria-pressed="true"');
  });

  it('renders the controls and localized consent copy', () => {
    const html = render();
    expect(html).toContain('Voice tracking is unavailable');
    expect(html).toContain('Focus');
    expect(html).toContain('A−');
    expect(html).toContain('A+');
    expect(html).toContain('Chrome/Edge may send audio');
  });

  it('handles a missing second language and empty blocks gracefully', () => {
    const html = render({
      scriptBlocks: [{ id: 'only', langA_text: 'Texte source', langB_text: '' }],
    });
    expect(text(html)).toContain('Texte source');
    expect(html).not.toContain('undefined');

    const empty = render({ scriptBlocks: [] });
    expect(text(empty)).toContain('No script text is available for this speech.');
  });

  it('exposes the highlight class contract', () => {
    expect(scriptHighlightClass(true)).toContain('text-red-500');
    expect(scriptHighlightClass(true)).toContain('font-bold');
    expect(scriptHighlightClass(false)).toBe('text-ink');
  });

  it('wires focus fallback, auto-scroll, language switching and active-block semantics', () => {
    const source = readFileSync(
      new URL('../src/components/BilingualScriptViewer.jsx', import.meta.url),
      'utf8',
    );
    expect(source).toContain('requestFullscreen');
    expect(source).toContain('setCssFocus(true)');
    expect(source).toContain("behavior: reducedMotion() ? 'auto' : 'smooth'");
    expect(source).toContain('scrollIntoView');
    expect(source).toContain('setActiveLanguage(next)');
    expect(source).toContain("aria-current={isActive ? 'true' : undefined}");
  });
});
