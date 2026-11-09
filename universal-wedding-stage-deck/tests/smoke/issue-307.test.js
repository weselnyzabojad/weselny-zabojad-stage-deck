import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ChildrenExpectedBadge from '../../src/components/ChildrenExpectedBadge.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const wedding = { childrenExpected: true };

describe('issue #307 children expected media wording', () => {
  it('shows only "Children expected" on every media role', () => {
    for (const role of ['photo1', 'photo2', 'video']) {
      const html = renderToStaticMarkup(createElement(ChildrenExpectedBadge, { wedding, role }));
      expect(html).toContain('Children expected');
      expect(html).not.toContain('keep them clear');
      expect(html).not.toContain('key moments');
    }
  });

  it('shows the not-expected state instead of hiding for non-media roles', () => {
    expect(
      renderToStaticMarkup(createElement(ChildrenExpectedBadge, {
        wedding: { childrenExpected: false },
        role: 'photo1',
      })),
    ).toContain('Children not expected');
    expect(
      renderToStaticMarkup(createElement(ChildrenExpectedBadge, { wedding, role: 'dj' })),
    ).toContain('Children expected');
  });

  it('localizes the short label', () => {
    expect(read('src/i18n/en.js')).toContain("'children.expectedBadge': 'Children expected'");
    expect(read('src/i18n/fr.js')).toContain("'children.expectedBadge': 'Enfants attendus'");
    expect(read('src/i18n/pl.js')).toContain("'children.expectedBadge': 'Dzieci będą obecne'");
  });
});
