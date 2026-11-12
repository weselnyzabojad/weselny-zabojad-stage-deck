import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ChildrenExpectedBadge from '../../src/components/ChildrenExpectedBadge.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const wedding = { childrenExpected: true };

describe('issue #277 children expected badge', () => {
  it('renders a state indicator for every role regardless of the boolean', () => {
    for (const role of ['photo1', 'photo2', 'video', 'mc', 'dj']) {
      expect(renderToStaticMarkup(createElement(ChildrenExpectedBadge, { wedding, role }))).toContain('Children expected');
    }
    expect(renderToStaticMarkup(createElement(ChildrenExpectedBadge, { wedding: { childrenExpected: false }, role: 'mc' }))).toContain('Children not expected');
  });

  it('adds the schema and Google Doc boolean', () => {
    const schema = JSON.parse(read('schema/wedding-schema-v1.1.json'));
    expect(schema.properties.childrenExpected.type).toBe('boolean');
    expect(read('schema/google-doc-template.md')).toContain('Children expected: yes');
  });

  it('renders in the MC and Photographer secondary bars', () => {
    expect(read('src/StageDeck.jsx')).not.toContain('<ChildrenExpectedBadge');
    expect(read('src/views/McMasterView.jsx')).toContain('<ChildrenExpectedBadge');
    expect(read('src/components/PhotographerView.jsx')).toContain('<ChildrenExpectedBadge');
  });
});
