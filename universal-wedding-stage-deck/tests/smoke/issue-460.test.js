import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DjSongRequestQueue from '../../src/components/DjSongRequestQueue.jsx';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const renderQueue = (props = {}) => renderToStaticMarkup(
  createElement(DjSongRequestQueue, {
    enabled: true,
    variant: 'bar',
    role: 'dj',
    accessToken: null,
    roomCode: 'abc123',
    ...props,
  }),
);

describe('issue #460 Song request QR launcher', () => {
  it('shows the QR launcher in the disconnected DJ VIP bar', () => {
    const html = renderQueue();
    expect(html).toContain('request QR');
    expect(html).not.toContain('disabled=""');
    expect(html).toContain('The request queue connects');
  });

  it('disables the launcher with a tooltip when no room code exists', () => {
    const html = renderQueue({ roomCode: null });
    expect(html).toContain('request QR');
    expect(html).toContain('disabled=""');
    expect(html).toContain('No room code is available for the guest request QR');
  });

  it('uses a full-screen ModalShell with a large local QR', () => {
    const source = read('src/components/DjSongRequestQueue.jsx');
    expect(source).toContain('<ModalShell');
    expect(source).toContain('size="full"');
    expect(source).toContain("width: 'min(80vmin, 80dvh)'");
    expect(source).toContain('fill');
    expect(source).toContain('<QrCodeImage');
    expect(source).not.toContain('api.qrserver');
    expect(source).not.toContain('chart.googleapis');
  });

  it('keeps the QR button a 44px target', () => {
    const source = read('src/components/DjSongRequestQueue.jsx');
    const button = source.slice(source.indexOf('const qrButton'), source.indexOf('const qrDialog'));
    expect(button).toContain('min-h-11');
    expect(button).toContain('disabled={!requestUrl}');
  });

  it('shows the URL and a copy action inside the dialog', () => {
    const source = read('src/components/DjSongRequestQueue.jsx');
    expect(source).toContain('navigator.clipboard.writeText(requestUrl)');
    expect(source).toContain('{requestUrl ??');
    expect(source).toContain("t('dj.requests.qrCopy')");
  });

  it('localizes the QR launcher and dialog', () => {
    for (const file of ['src/i18n/en.js', 'src/i18n/fr.js', 'src/i18n/pl.js']) {
      const source = read(file);
      for (const key of [
        'dj.requests.qrButton',
        'dj.requests.qrDialogBody',
        'dj.requests.qrUnavailable',
        'dj.requests.qrCopy',
        'dj.requests.qrCopied',
      ]) {
        expect(source, `${file} ${key}`).toContain(`'${key}'`);
      }
    }
  });
});
