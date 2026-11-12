import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

describe('issue #796 Sentry sourcemap upload pipeline', () => {
  const vite = read('vite.config.js');
  const example = read('.env.example');
  const pkg = JSON.parse(read('package.json'));

  it('wires the Sentry Vite plugin as a dev dependency', () => {
    expect(pkg.devDependencies['@sentry/vite-plugin']).toBeTruthy();
    expect(vite).toContain("import { sentryVitePlugin } from '@sentry/vite-plugin'");
    expect(vite).toContain('sentryVitePlugin({');
  });

  it('emits hidden maps only when an upload token exists', () => {
    expect(vite).toContain('process.env.SENTRY_AUTH_TOKEN');
    expect(vite).toContain("sourcemap: SENTRY_UPLOAD_ENABLED ? 'hidden' : false");
    expect(vite).toContain('SENTRY_UPLOAD_ENABLED &&');
    expect(vite).toContain('filesToDeleteAfterUpload');
    expect(vite).toContain('telemetry: false');
  });

  it('never reads Sentry build secrets from the browser env', () => {
    expect(vite).not.toMatch(/import\.meta\.env\.SENTRY_/);
    expect(vite).not.toMatch(/VITE_SENTRY_AUTH_TOKEN|VITE_SENTRY_ORG|VITE_SENTRY_PROJECT/);
  });

  it('documents the build-only secrets', () => {
    for (const name of ['SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT']) {
      expect(example).toContain(name);
    }
    expect(example).toMatch(/never behind VITE_\*/);
    expect(example).toMatch(/deleted from dist/);
  });
});
