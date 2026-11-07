import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #332 dev and secondary mobile density', () => {
  it('keeps the dev switcher inside the narrow viewport above bottom nav', () => {
    const source = read('src/components/DevViewSwitcher.jsx');
    expect(source).toContain('bottom-20');
    expect(source).toContain('max-h-[45dvh]');
    expect(source).toContain('overflow-y-auto');
    expect(source).toContain('grid-cols-2');
    expect(source).toContain('sm:bottom-3');
  });

  it('keeps dev controls at touch-friendly height', () => {
    expect(read('src/components/DevViewSwitcher.jsx')).toContain('min-h-9');
  });

  it('uses the shared compact Venue Manager chrome', () => {
    const venue = read('src/components/VenueManagerView.jsx');
    expect(venue).toContain('<RoleShell');
    expect(venue).toContain('clock={clock}');
    expect(venue).toContain('pin={pin}');
    expect(venue).toContain('space-y-3 sm:space-y-4');
    expect(venue).toContain('p-3 shadow-lg sm:p-4');
  });

  it('does not add mobile admin affordances', () => {
    expect(read('src/admin/AdminApp.jsx')).not.toContain('RoleShell');
    expect(read('src/components/DevViewSwitcher.jsx')).not.toContain('Admin');
  });
});
