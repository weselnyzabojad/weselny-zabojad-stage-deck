import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1017 focused single-card QR carousel', () => {
  it('renders one active slide with rounded navigation and dots', () => {
    const cards = read('src/admin/AdminQrCards.jsx');
    expect(cards).toContain('aria-roledescription="carousel"');
    expect(cards).toContain('translateX(-${currentIndex * 100}%)');
    expect(cards).toContain('Previous role card');
    expect(cards).toContain('Next role card');
    expect(cards).toContain('aria-current={index === currentIndex');
    expect(cards).toContain('Show ${card.label} card');
    expect(cards).toContain('h-56 w-56');
  });

  it('supports swipe and keyboard navigation with accessible announcements', () => {
    const cards = read('src/admin/AdminQrCards.jsx');
    expect(cards).toContain('onTouchStart={onTouchStart}');
    expect(cards).toContain('onTouchEnd={onTouchEnd}');
    expect(cards).toContain("event.key === 'ArrowLeft'");
    expect(cards).toContain("event.key === 'ArrowRight'");
    expect(cards).toContain("event.key === 'Home'");
    expect(cards).toContain("event.key === 'End'");
    expect(cards).toContain('aria-hidden={active ? undefined : \'true\'}');
    expect(cards).toContain('inert={active ? undefined : true}');
    expect(cards).toContain('aria-live="polite"');
    expect(cards).toContain('motion-reduce:transition-none');
  });

  it('hides navigation for a single card and keeps the empty state', () => {
    const cards = read('src/admin/AdminQrCards.jsx');
    expect(cards).toContain('cards.length > 1 ?');
    expect(cards).toContain('No roles to print.');
  });

  it('prints every slide as a two-column grid regardless of the active index', () => {
    const css = read('src/index.css');
    expect(css).toContain('.admin-print-track');
    expect(css).toContain('.admin-print-rail');
    expect(css).toContain('grid-template-columns: 1fr 1fr');
    expect(css).toContain('transform: none !important');
    expect(css).toContain('width: auto !important');
    expect(css).toContain('.admin-qr-card');
    expect(css).not.toContain('.admin-print-grid');
  });

  it('never encodes or renders a PIN', () => {
    const cards = read('src/admin/AdminQrCards.jsx');
    expect(cards).not.toContain('pin_hash');
    expect(cards).not.toContain('card.pin');
    expect(cards).toContain('PINs are never printed.');
  });
});
