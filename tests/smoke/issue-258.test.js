import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #258 DJ Standard preview is package-based', () => {
  it('removes dj_standard as a view role id', () => {
    expect(read('src/lib/viewRoles.js')).not.toContain('dj_standard');
    expect(read('src/components/DevViewSwitcher.jsx')).not.toContain('dj_standard');
    const deck = read('src/StageDeck.jsx');
    expect(deck).not.toContain('dj_standard');
  });

  it('keeps DJ Standard reachable through the cartridge service package', () => {
    const deck = read('src/StageDeck.jsx');
    expect(deck).toContain('servicePackage={djViewWedding.servicePackage}');
    expect(read('src/components/DjBoothView.jsx')).toContain(
      'servicePackage ?? resolveServicePackage(wedding)',
    );
  });
});
