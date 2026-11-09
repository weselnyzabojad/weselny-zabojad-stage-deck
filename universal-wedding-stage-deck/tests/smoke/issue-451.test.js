import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ChildrenExpectedBadge from '../../src/components/ChildrenExpectedBadge.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #451 permanent children state indicator', () => {
  it('renders red for expected and green for not expected', () => {
    const expected = renderToStaticMarkup(
      createElement(ChildrenExpectedBadge, { wedding: { childrenExpected: true }, inline: true }),
    );
    expect(expected).toContain('Children expected');
    expect(expected).toContain('border-red-600');
    expect(expected).toContain('bg-red-950/95');
    expect(expected).not.toContain('amber');

    const notExpected = renderToStaticMarkup(
      createElement(ChildrenExpectedBadge, { wedding: { childrenExpected: false }, inline: true }),
    );
    expect(notExpected).toContain('Children not expected');
    expect(notExpected).toContain('border-emerald-600');
    expect(notExpected).toContain('bg-emerald-950/95');
  });

  it('treats an absent boolean as not expected', () => {
    const html = renderToStaticMarkup(createElement(ChildrenExpectedBadge, { wedding: {} }));
    expect(html).toContain('Children not expected');
  });

  it('keeps the compact badge icon-only with translated accessible text', () => {
    const html = renderToStaticMarkup(
      createElement(ChildrenExpectedBadge, { wedding: { childrenExpected: true }, compact: true }),
    );
    expect(html).toContain('aria-label="Children expected"');
    expect(html).toContain('title="Children expected"');
    expect(html).toContain('role="status"');
    expect(html).toContain('<svg');
    expect(html).not.toContain('>Children expected<');
    expect(html).toContain('min-h-11 min-w-11');
  });

  it('renders in every stage role secondary bar and pocket shell', () => {
    for (const file of [
      'src/views/McMasterView.jsx',
      'src/components/DjBoothView.jsx',
      'src/components/PhotographerView.jsx',
      'src/components/VenueManagerView.jsx',
    ]) {
      expect(read(file), file).toContain('<ChildrenExpectedBadge');
    }
    const speaker = read('src/components/SpeakerView.jsx');
    expect(speaker).not.toContain('<ChildrenExpectedBadge');
    expect(speaker).toContain('showChildrenExpected={false}');
    const shell = read('src/components/RoleShell.jsx');
    expect(shell).toContain('{showChildrenExpected ? <ChildrenExpectedBadge wedding={wedding} compact /> : null}');
    expect(shell).toContain('showChildrenExpected = true');
  });

  it('localizes the not-expected state', () => {
    expect(read('src/i18n/en.js')).toContain("'children.notExpectedBadge': 'Children not expected'");
    expect(read('src/i18n/fr.js')).toContain("'children.notExpectedBadge': 'Enfants non attendus'");
    expect(read('src/i18n/pl.js')).toContain("'children.notExpectedBadge': 'Dzieci nie będą obecne'");
  });
});
