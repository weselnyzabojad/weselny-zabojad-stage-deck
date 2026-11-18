import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GuestEngagementChart } from '../src/components/GuestEngagementHeatmap.jsx';
import { buildHeatmapModel } from '../src/lib/guestEngagement.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const steps = [
  { id: 'a', title: 'Arrival', type: 'FLEXIBLE', time: '18:00' },
  { id: 'b', title: 'Dinner', type: 'HARD_ANCHOR', time: '19:00' },
  { id: 'c', title: 'Close', type: 'HARD_ANCHOR', time: '21:00', mandatory: { kind: 'CLOSURE' } },
];

function model(requests) {
  return buildHeatmapModel({
    requests,
    steps,
    eventComplete: true,
    timeZone: 'Europe/Warsaw',
  });
}

describe('issue #1207 guest engagement heatmap widget', () => {
  it('renders the SVG chart, buckets, blocks and tooltips', () => {
    const html = renderToStaticMarkup(
      createElement(GuestEngagementChart, {
        model: model([
          { createdAt: '2026-08-20T16:00:00Z' },
          { createdAt: '2026-08-20T16:01:00Z' },
        ]),
      }),
    );
    expect(html).toContain('data-testid="guest-engagement-chart"');
    expect(html).toContain('<svg');
    expect(html).toContain('fill-emerald-400');
    expect(html).toContain('18:00');
    expect(html).toContain('04:00');
    expect(html).toContain('Arrival');
    expect(html).toContain('18:00–18:15: 2 requests');
    expect(html).toContain('<p class="sr-only">');
  });

  it('shows the empty state without requests', () => {
    const html = renderToStaticMarkup(
      createElement(GuestEngagementChart, { model: model([]) }),
    );
    expect(html).toContain('No requests were recorded');
  });

  it('reports excluded requests', () => {
    const html = renderToStaticMarkup(
      createElement(GuestEngagementChart, {
        model: model([{ createdAt: '2026-08-20T02:00:00Z' }]),
      }),
    );
    expect(html).toContain('1 requests outside the window');
  });

  it('mounts the widget in the admin wedding detail', () => {
    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain('GuestEngagementHeatmap');
    expect(app).toContain('wedding={wedding}');
    expect(read('src/admin/adminApi.js')).toContain("callAdmin('music_engagement'");
    const widget = read('src/components/GuestEngagementHeatmap.jsx');
    expect(widget).toContain('eventComplete');
    expect(widget).toContain('details');
  });

  it('keeps the widget copy in PL, EN and FR', () => {
    for (const locale of ['pl', 'en', 'fr']) {
      const dict = read(`src/i18n/${locale}.js`);
      for (const key of [
        'admin.engagement.title',
        'admin.engagement.subtitle',
        'admin.engagement.empty',
        'admin.engagement.error',
        'admin.engagement.chartLabel',
        'admin.engagement.bucketSummary',
      ]) {
        expect(dict).toContain(`'${key}'`);
      }
    }
  });
});
