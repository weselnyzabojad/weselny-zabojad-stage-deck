import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #723 modal portal stacking', () => {
  it('portals the modal to the document body', () => {
    const modal = read('src/components/ModalShell.jsx');
    expect(modal).toContain("import { createPortal } from 'react-dom'");
    expect(modal).toContain('createPortal(content, document.body)');
    expect(modal).toContain("typeof document === 'undefined'");
  });

  it('keeps the shared modal interactions intact', () => {
    const modal = read('src/components/ModalShell.jsx');
    expect(modal).toContain("event.key === 'Escape'");
    expect(modal).toContain('event.target === event.currentTarget');
    expect(modal).toContain('z-modal');
  });
});
