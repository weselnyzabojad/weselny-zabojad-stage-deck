import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AdminRecapPanel from '../src/admin/AdminRecapPanel.jsx';
import { buildWeddingRecap, recapPublicationStatus } from '../src/lib/weddingRecap.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('issue #1136 admin recap preview and publish', () => {
  it('renders the private preview panel without creating a token', () => {
    const html = renderToStaticMarkup(
      createElement(AdminRecapPanel, {
        wedding: { wedding_id: 'W-UM-2026-08-001' },
        readOnly: false,
      }),
    );
    expect(html).toContain('Wedding recap');
    expect(html).toContain('Loading recap preview');
    expect(html).not.toContain('recap/');
  });

  it('wires source, preview, publish, list and revoke actions', () => {
    const panel = read('src/admin/AdminRecapPanel.jsx');
    const api = read('src/admin/adminApi.js');
    const app = read('src/admin/AdminApp.jsx');
    for (const action of ['getRecapSource', 'publishRecap', 'listRecaps', 'revokeRecap']) {
      expect(panel).toContain(action);
      expect(api).toContain(`export async function ${action}`);
    }
    expect(panel).toContain('buildWeddingRecap');
    expect(panel).toContain('Not enough recap data yet');
    expect(panel).toContain('Publish this immutable 90-day recap?');
    expect(panel).toContain('copyLink');
    expect(panel).toContain('Confirm revoke');
    expect(app).toContain('<AdminRecapPanel');
  });

  it('marks active, expired and revoked recaps', () => {
    expect(recapPublicationStatus({ expires_at: '2099-01-01T00:00:00.000Z' })).toBe('active');
    expect(recapPublicationStatus({ expires_at: '2020-01-01T00:00:00.000Z' })).toBe('expired');
    expect(
      recapPublicationStatus({
        expires_at: '2099-01-01T00:00:00.000Z',
        revoked_at: '2026-01-01T00:00:00.000Z',
      }),
    ).toBe('revoked');
  });

  it('builds a preview from empty data without throwing', () => {
    const recap = buildWeddingRecap({
      wedding: { weddingId: 'W-UM-2026-08-001', steps: [] },
      generatedAt: new Date('2026-08-25T10:00:00.000Z'),
    });
    expect(recap.timeline).toEqual([]);
    expect(recap.summary.totalSteps).toBe(0);
  });
});
