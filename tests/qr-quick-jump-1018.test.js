import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1018 QR quick-jump role pills', () => {
  it('renders a horizontal pill for every card only when multiple roles exist', () => {
    const cards = read('src/admin/AdminQrCards.jsx');
    expect(cards).toContain('Jump to a role card');
    expect(cards).toContain('overflow-x-auto pb-1');
    expect(cards).toContain('{card.label}');
    expect(cards).toContain('cards.length > 1 ?');
  });

  it('marks the active pill and jumps without changing dots/announcement state', () => {
    const cards = read('src/admin/AdminQrCards.jsx');
    expect(cards).toContain('aria-pressed={index === currentIndex}');
    expect(cards).toContain("aria-current={index === currentIndex ? 'true' : undefined}");
    expect(cards).toContain('onClick={() => jump(index)}');
    expect(cards).toContain('scrollIntoView?.');
    expect(cards).toContain('pillRefs.current[index]');
  });

  it('keeps the pill row hidden for a single card and outside the print track', () => {
    const cards = read('src/admin/AdminQrCards.jsx');
    const pillBlock = cards.slice(cards.indexOf('Jump to a role card'), cards.indexOf('<section'));
    expect(pillBlock).toContain(': null}');
    expect(pillBlock).not.toContain('admin-print-track');
    const css = read('src/index.css');
    expect(css).not.toContain('Jump to a role card');
  });
});
