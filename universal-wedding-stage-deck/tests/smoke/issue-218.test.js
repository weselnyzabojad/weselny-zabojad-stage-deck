import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DjSongRequestQueue from '../../src/components/DjSongRequestQueue.jsx';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('issue #218 DJ VIP guest request bar', () => {
  const dj = read('src/components/DjBoothView.jsx');

  it('renders a compact request bar below the top bar for VIP only', () => {
    const barCalls = dj.match(/variant="bar"/g) ?? [];
    expect(barCalls.length).toBe(2);
    expect(dj).toContain('{isVip ? (');
    expect(dj).toContain('<DjSongRequestQueue');
    expect(dj).not.toContain('<SongRequestQueueList');
  });

  it('keeps the sticky header and request bar together', () => {
    expect(dj).toContain('<div className="sticky top-0 z-30">');
  });

  it('renders an unavailable bar state through the existing queue component', () => {
    const html = renderToStaticMarkup(
      createElement(DjSongRequestQueue, {
        enabled: true,
        variant: 'bar',
        role: 'dj',
        accessToken: null,
        roomCode: 'ABC123',
      }),
    );
    expect(html).toContain('Guest requests');
    expect(html).toContain('connect in production');
  });

  it('does not render for non-moderator roles', () => {
    const html = renderToStaticMarkup(
      createElement(DjSongRequestQueue, {
        enabled: true,
        variant: 'bar',
        role: 'photo',
        accessToken: 'token',
        roomCode: 'ABC123',
      }),
    );
    expect(html).toBe('');
  });

  it('reuses the existing queue API and public QR form', () => {
    const queue = read('src/components/DjSongRequestQueue.jsx');
    expect(queue).toContain('fetchSongRequests');
    expect(queue).toContain('updateSongRequestStatus');
    expect(queue).toContain('buildSongRequestUrl');
    expect(queue).toContain('QrCodeImage');
  });
});
