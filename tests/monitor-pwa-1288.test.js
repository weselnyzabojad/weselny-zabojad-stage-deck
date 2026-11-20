import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  STATUS_MANIFEST_PATH,
  STATUS_PATH,
  STATUS_SCOPE,
  STATUS_START_URL,
  STATUS_SW_PATH,
  isMonitorStandalone,
  isStatusPath,
} from '../src/lib/monitorPwa.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const binary = (path) => readFileSync(new URL(`../${path}`, import.meta.url));

function pngSize(buffer) {
  expect(buffer.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

describe('issue #1288 Wedding Monitor PWA shell', () => {
  it('detects only the /status route and its start URL', () => {
    expect(STATUS_PATH).toBe('/status');
    expect(STATUS_SCOPE).toBe('/status');
    expect(STATUS_MANIFEST_PATH).toBe('/status/manifest.webmanifest');
    expect(STATUS_SW_PATH).toBe('/status/sw.js');
    expect(STATUS_START_URL).toBe('/status?pwa=1');

    expect(isStatusPath('/status')).toBe(true);
    expect(isStatusPath('/status/')).toBe(true);
    expect(isStatusPath('/admin')).toBe(false);
    expect(isStatusPath('/status/extra')).toBe(false);
    expect(isStatusPath('/')).toBe(false);
  });

  it('detects standalone launches from display mode, iOS flag or ?pwa=1', () => {
    expect(
      isMonitorStandalone({
        matchMedia: () => ({ matches: true }),
        navigator: {},
        search: '',
      }),
    ).toBe(true);
    expect(
      isMonitorStandalone({
        matchMedia: () => ({ matches: false }),
        navigator: { standalone: true },
        search: '',
      }),
    ).toBe(true);
    expect(
      isMonitorStandalone({
        matchMedia: () => ({ matches: false }),
        navigator: {},
        search: '?pwa=1',
      }),
    ).toBe(true);
    expect(
      isMonitorStandalone({
        matchMedia: () => ({ matches: false }),
        navigator: {},
        search: '?pwa=0',
      }),
    ).toBe(false);
  });

  it('ships the dedicated monitor manifest with installable metadata', () => {
    const manifest = JSON.parse(read('public/status/manifest.webmanifest'));
    expect(manifest.name).toBe('Wedding Monitor');
    expect(manifest.short_name).toBe('Monitor');
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('any');
    expect(manifest.id).toBe('/status');
    expect(manifest.scope).toBe('/status');
    expect(manifest.start_url).toBe('/status?pwa=1');
    expect(manifest.theme_color).toBe('#B89550');
    expect(manifest.background_color).toBe('#FAF8F5');

    expect(manifest.icons).toHaveLength(2);
    for (const icon of manifest.icons) {
      expect(icon.purpose).toContain('maskable');
      expect(icon.src).toMatch(/^\/status\/icon-(192|512)\.png$/);
    }
  });

  it('ships real maskable 192 and 512 PNG icons', () => {
    for (const [file, size] of [
      ['public/status/icon-192.png', 192],
      ['public/status/icon-512.png', 512],
    ]) {
      expect(existsSync(new URL(`../${file}`, import.meta.url))).toBe(true);
      expect(pngSize(binary(file))).toEqual({ width: size, height: size });
    }
  });

  it('registers the monitor worker with /status scope without touching the deck worker', () => {
    const bootstrap = read('public/status-bootstrap.js');
    expect(bootstrap).toContain("path !== '/status'");
    expect(bootstrap).toContain("setAttribute('href', '/status/manifest.webmanifest')");
    expect(bootstrap).toContain("navigator.serviceWorker");
    expect(bootstrap).toContain("register('/status/sw.js', { scope: '/status' })");

    const sw = read('public/status/sw.js');
    expect(sw).toContain("const CACHE_NAME = 'wedding-monitor-v1'");
    expect(sw).toContain("self.addEventListener('install'");
    expect(sw).toContain("self.addEventListener('fetch'");
    expect(sw).not.toContain("'/sw.js'");

    const index = read('index.html');
    expect(index).toContain('<script src="/status-bootstrap.js" defer></script>');
  });

  it('routes /status to the monitor without the deck update prompt', () => {
    const main = read('src/main.jsx');
    expect(main).toContain('isStatusPath');
    expect(main).toContain('<AdminApp statusMode={IS_STATUS} />');
    expect(main).toContain(
      'IS_LANDING || IS_BANNER || RECAP_TOKEN || EMBED_ROUTE || IS_STATUS ? null : <PwaUpdatePrompt />',
    );
  });

  it('bypasses the desktop gate and omits the four admin tabs on /status', () => {
    const app = read('src/admin/AdminApp.jsx');
    expect(app).toContain('export default function AdminApp({ statusMode = false })');
    expect(app).toContain('if (!statusMode && !supported) return <AdminViewportBlocked />');
    expect(app).toContain('{statusMode ? null : (');
    expect(app).toContain('<AdminStatusDashboard />');
    expect(app).toContain("statusMode ? 'admin-status-panel' : 'admin-tab-panel'");
    expect(app).toContain("statusMode ? 'Wedding Monitor' : 'Wedding library'");

    const dashboard = read('src/admin/AdminStatusDashboard.jsx');
    expect(dashboard).toContain('HEALTH_PROVIDER_ORDER.map');
    expect(dashboard).toContain('isMonitorStandalone');
    expect(dashboard).toContain('Service monitor');
  });
});
