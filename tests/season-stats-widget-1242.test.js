import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const widget = read('src/components/PublicSeasonStatsWidget.jsx');
const pkg = JSON.parse(read('package.json'));

describe('issue #1242 public season KPI widget redesign', () => {
  it('uses the editorial champagne design tokens', () => {
    for (const token of [
      'bg-[#FFFDF9]',
      'border-[#EAE2D3]',
      'shadow-[0_4px_20px_-4px_rgba(184,149,80,0.08)]',
      'text-[#1C1917]',
      'text-[#78716C]',
      'text-[#B89550]',
      'bg-[#F7F2E7]',
      'bg-[#FAF8F5]',
    ]) {
      expect(widget).toContain(token);
    }
    expect(widget).toContain('tabular-nums');
    expect(widget).toContain('tracking-[0.12em]');
    expect(widget).not.toContain('font-mono');
  });

  it('uses lucide-react icons and the compact responsive grid', () => {
    expect(pkg.dependencies['lucide-react']).toBeTruthy();
    expect(widget).toContain("from 'lucide-react'");
    for (const icon of ['Users', 'Globe2', 'Plane', 'Sparkles', 'CarFront', 'ArrowRight']) {
      expect(widget).toContain(icon);
    }
    expect(widget).toContain('grid-cols-2');
    expect(widget).toContain('lg:grid-cols-4');
    expect(widget).toContain('overflow-hidden');
  });

  it('replaces the Sto Lat card with international weddings', () => {
    expect(widget).toContain("t('embed.kpi.international')");
    expect(widget).toContain("t('embed.kpi.internationalDetail')");
    expect(widget).toContain("!== 'PL'");
    expect(widget).not.toContain("embed.kpi.stolat");
  });

  it('keeps the compact next-wedding strip and branded footer', () => {
    expect(widget).toContain("t('embed.nextWedding')");
    expect(widget).toContain("t('embed.seasonLive')");
    expect(widget).toContain("t('embed.footer.season')");
    expect(widget).toContain("t('embed.footer.powered')");
    expect(widget).toContain("t('embed.footer.brand')");
    expect(widget).toContain('target="_blank"');
    expect(widget).toContain('rel="noopener noreferrer"');
  });
});
