import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import CulturalRulesBar from '../src/components/CulturalRulesBar.jsx';
import SpeechesChip from '../src/components/SpeechesChip.jsx';
import { setLocale } from '../src/i18n/index.js';

const render = (element) => renderToStaticMarkup(element);
const visibleText = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const denseGrid = () =>
  render(
    createElement(
      CulturalRulesBar,
      {
        rules: { sto_lat: { status: 'YES' }, gorzko: { status: 'STRICT_NO' } },
        oczepinyStatus: { state: 'ON' },
        grid: true,
        dense: true,
      },
      createElement(SpeechesChip, {
        mode: 'COMPLEX',
        speeches: [{ id: 's1', speaker: { name: 'Anna' } }],
        dense: true,
      }),
    ),
  );

describe('issue #755 label-only desktop top bar toggles', () => {
  afterEach(() => setLocale('en', { persist: false }));

  it('renders only the four primary labels in grid order', () => {
    setLocale('en', { persist: false });
    const html = denseGrid();
    expect(visibleText(html)).toBe('Sto Lat Gorzko Oczepiny Speeches');
  });

  it('does not render icons, status dots or secondary state text', () => {
    const html = denseGrid();
    expect(visibleText(html)).not.toContain('STRICT NO');
    expect(visibleText(html)).not.toContain('COMPLEX');
    expect(html).not.toContain('text-sm');
    expect(html).not.toContain('h-1 w-1');
    expect(html).not.toContain('shadow-[0_0_8px_currentColor]');
  });

  it('keeps the full state accessible through aria-label and title', () => {
    const html = denseGrid();
    expect(html).toContain('aria-label="Sto Lat: YES"');
    expect(html).toContain('title="Gorzko: STRICT NO"');
    expect(html).toContain('aria-label="Oczepiny: ON');
    expect(html).toContain('aria-label="Speeches: COMPLEX');
  });

  it('preserves green/red tone classes and the 2x2 grid', () => {
    const html = denseGrid();
    expect(html).toContain('grid max-w-full grid-cols-2 gap-1.5');
    expect(html).toContain('border-tone-positive-border');
    expect(html).toContain('border-tone-negative-border');
  });

  it('keeps the speeches label localized', () => {
    setLocale('pl', { persist: false });
    expect(visibleText(denseGrid())).toBe('Sto Lat Gorzko Oczepiny Przemowy');
    setLocale('fr', { persist: false });
    expect(visibleText(denseGrid())).toBe('Sto Lat Gorzko Oczepiny Discours');
  });

  it('keeps the pocket chip text-only and unchanged', () => {
    const html = render(
      createElement(
        CulturalRulesBar,
        {
          rules: { sto_lat: { status: 'YES' } },
          oczepinyStatus: { state: 'OFF' },
          compact: true,
        },
        createElement(SpeechesChip, { mode: 'OFF', speeches: [], compact: true }),
      ),
    );
    expect(visibleText(html)).toBe('Sto Lat Gorzko Oczepiny Speeches');
    expect(html).toContain('flex flex-wrap items-center justify-center gap-1.5');
  });
});
