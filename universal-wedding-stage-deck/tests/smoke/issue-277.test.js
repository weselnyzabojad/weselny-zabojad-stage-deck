import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ChildrenExpectedBadge from '../../src/components/ChildrenExpectedBadge.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const wedding = { childrenExpected: true };

describe('issue #277 children expected badge', () => {
  it('shows for MC and all media roles only when true', () => {
    for (const role of ['photo1', 'photo2', 'video']) {
      expect(renderToStaticMarkup(createElement(ChildrenExpectedBadge, { wedding, role }))).toContain('Children');
    }
    expect(renderToStaticMarkup(createElement(ChildrenExpectedBadge, { wedding, role: 'mc' }))).toBe('');
    expect(renderToStaticMarkup(createElement(ChildrenExpectedBadge, { wedding: { childrenExpected: false }, role: 'mc' }))).toBe('');
    expect(renderToStaticMarkup(createElement(ChildrenExpectedBadge, { wedding, role: 'dj' }))).toBe('');
  });

  it('adds the schema and Google Doc boolean', () => {
    const schema = JSON.parse(read('schema/wedding-schema-v1.1.json'));
    expect(schema.properties.childrenExpected.type).toBe('boolean');
    expect(read('schema/google-doc-template.md')).toContain('Children expected: yes');
  });

  it('renders globally in StageDeck', () => {
    expect(read('src/StageDeck.jsx')).toContain('<ChildrenExpectedBadge');
  });
});
