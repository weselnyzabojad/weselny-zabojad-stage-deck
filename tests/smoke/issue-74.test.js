import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const readBytes = (path) => readFileSync(new URL(`../../${path}`, import.meta.url));

function pngSize(path) {
  const bytes = readBytes(path);
  // PNG signature + IHDR width/height (big-endian) at bytes 16 and 20.
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe('issue #74 PWA assets', () => {
  it('ships the manifest icons at the expected sizes', () => {
    expect(pngSize('public/pwa-192x192.png')).toEqual({ width: 192, height: 192 });
    expect(pngSize('public/pwa-512x512.png')).toEqual({ width: 512, height: 512 });
  });

  it('ships a square apple touch icon', () => {
    expect(pngSize('public/apple-touch-icon.png')).toEqual({ width: 180, height: 180 });
  });

  it('references the 192 and 512 icons from the manifest', () => {
    const config = read('vite.config.js');
    expect(config).toContain("src: 'pwa-192x192.png'");
    expect(config).toContain("src: 'pwa-512x512.png'");
    expect(config).toContain("sizes: '192x192'");
    expect(config).toContain("sizes: '512x512'");
  });

  it('resolves the install scope relative to the served directory', () => {
    const config = read('vite.config.js');
    // `./` resolves to `/` at the site root and to `/deck/` when the manifest
    // is served from the `/deck/` production subpath.
    expect(config).toMatch(/scope:\s*'\.\/'/);
    expect(config).toMatch(/start_url:\s*'\.\/'/);

    const manifestUrl = 'https://deck.example/deck/manifest.webmanifest';
    expect(new URL('./', manifestUrl).pathname).toBe('/deck/');
    expect(new URL('pwa-512x512.png', manifestUrl).pathname).toBe(
      '/deck/pwa-512x512.png',
    );
  });

  it('links a real favicon and apple touch icon without Vite leftovers', () => {
    const html = read('index.html');
    expect(html).toContain('rel="icon" type="image/svg+xml" href="/favicon.svg"');
    expect(html).toContain('rel="apple-touch-icon" href="/apple-touch-icon.png"');
    expect(html).not.toContain('/vite.svg');
    expect(read('public/favicon.svg')).toContain('<svg');
  });
});
