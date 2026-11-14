import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  SERVER_SECRET_VARS,
  findDangerousClientVars,
  parseEnv,
  validateEnv,
} from '../../scripts/validate-env.mjs';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');
const SCRIPT = fileURLToPath(new URL('../../scripts/validate-env.mjs', import.meta.url));

const validEnv = {
  VITE_SUPABASE_URL: 'https://project-ref.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.c2lnbmF0dXJl',
};

const tempDirs = [];
function tempEnvFile(contents) {
  const dir = mkdtempSync(join(tmpdir(), 'wzsd-env-'));
  tempDirs.push(dir);
  const file = join(dir, '.env.local');
  writeFileSync(file, contents);
  return file;
}

function runCli(args, env = {}) {
  const cleanEnv = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => !name.startsWith('VITE_') && !SERVER_SECRET_VARS.includes(name),
    ),
  );
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    env: { ...cleanEnv, ...env },
  });
}

function jwtWithRole(role) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode({ role })}.signature`;
}

afterEach(() => {
  while (tempDirs.length) rmSync(tempDirs.pop(), { recursive: true, force: true });
});

describe('issue #374 environment validation', () => {
  it('parses dotenv syntax including quotes, exports and comments', () => {
    const env = parseEnv(
      [
        '# comment',
        'export VITE_SUPABASE_URL="https://example.supabase.co"',
        "VITE_SUPABASE_ANON_KEY='public-key'",
        'VITE_DECK_MODE=production # inline comment',
      ].join('\n'),
    );
    expect(env).toEqual({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'public-key',
      VITE_DECK_MODE: 'production',
    });
  });

  it('accepts a complete browser-safe configuration', () => {
    const result = validateEnv(validEnv);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('reports missing variables with an actionable message', () => {
    const result = validateEnv({});
    expect(result.errors).toHaveLength(2);
    expect(result.errors.join(' ')).toContain('VITE_SUPABASE_URL');
    expect(result.errors.join(' ')).toContain('.env.example');
    expect(result.errors.join(' ')).toContain('.env.local');
  });

  it('only warns about missing values with allowMissing', () => {
    const result = validateEnv({}, { allowMissing: true });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toHaveLength(2);
  });

  it('rejects malformed and non-https project URLs', () => {
    expect(validateEnv({ ...validEnv, VITE_SUPABASE_URL: 'not-a-url' }).errors.join(' ')).toContain(
      'not a valid URL',
    );
    expect(
      validateEnv({ ...validEnv, VITE_SUPABASE_URL: 'http://example.supabase.co' }).errors.join(' '),
    ).toContain('https://');
    expect(
      validateEnv({ ...validEnv, VITE_SUPABASE_URL: 'https://example.supabase.co/rest/v1' }).errors.join(' '),
    ).toContain('without a path');
  });

  it('rejects unsupported deck modes', () => {
    const result = validateEnv({ ...validEnv, VITE_DECK_MODE: 'demo' });
    expect(result.errors.join(' ')).toContain('VITE_DECK_MODE');
  });

  it('rejects server secret names and values behind VITE_*', () => {
    const byName = validateEnv({ ...validEnv, VITE_SUPABASE_SERVICE_ROLE_KEY: 'hidden-value' });
    expect(byName.errors.join(' ')).toContain('VITE_SUPABASE_SERVICE_ROLE_KEY');
    expect(byName.errors.join(' ')).not.toContain('hidden-value');

    const byRole = validateEnv({
      ...validEnv,
      VITE_SUPABASE_ANON_KEY: jwtWithRole('service_role'),
    });
    expect(byRole.errors.join(' ')).toContain('service-role');

    const byKey = validateEnv({
      ...validEnv,
      VITE_GOOGLE_CREDENTIALS: '-----BEGIN PRIVATE KEY-----\nsensitive-value\n-----END PRIVATE KEY-----',
    });
    expect(byKey.errors.join(' ')).toContain('private key');
    expect(byKey.errors.join(' ')).not.toContain('sensitive-value');
  });

  it('finds dangerous combined variables without exposing values', () => {
    const findings = findDangerousClientVars({
      VITE_OK: 'value',
      VITE_SUPABASE_SERVICE_ROLE_KEY: 'sensitive',
      VITE_GOOGLE_PRIVATE_KEY: 'sensitive',
    });
    expect(findings.map((finding) => finding.name)).toEqual([
      'VITE_SUPABASE_SERVICE_ROLE_KEY',
      'VITE_GOOGLE_PRIVATE_KEY',
    ]);
    expect(JSON.stringify(findings)).not.toContain('sensitive');
  });

  it('passes from the CLI for a complete env file', () => {
    const file = tempEnvFile(
      `VITE_SUPABASE_URL=${validEnv.VITE_SUPABASE_URL}\nVITE_SUPABASE_ANON_KEY=${validEnv.VITE_SUPABASE_ANON_KEY}\n`,
    );
    const result = runCli(['--env-file', file]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Client configuration is valid');
  });

  it('fails from the CLI for missing values', () => {
    const result = runCli(['--env-file', tempEnvFile('VITE_DECK_MODE=local\n')]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Missing required client variable VITE_SUPABASE_URL');
    expect(result.stdout).toContain('docs/admin-setup-and-secrets.md');
  });

  it('fails from the CLI when a secret is placed behind VITE_*', () => {
    const file = tempEnvFile(
      `VITE_SUPABASE_URL=${validEnv.VITE_SUPABASE_URL}\n` +
        `VITE_SUPABASE_ANON_KEY=${validEnv.VITE_SUPABASE_ANON_KEY}\n` +
        'VITE_SUPABASE_SERVICE_ROLE_KEY=super-secret-value\n',
    );
    const result = runCli(['--env-file', file]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('VITE_SUPABASE_SERVICE_ROLE_KEY');
    expect(result.stdout).not.toContain('super-secret-value');
  });
});

describe('issue #374 configuration documentation', () => {
  it('documents every client and server variable in .env.example', () => {
    const example = read('.env.example');
    for (const name of [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'VITE_DECK_MODE',
      'VITE_SUPABASE_SYNC_TABLE',
      'VITE_SUPABASE_ROOM_PREFIX',
      'VITE_ADMIN_DEMO',
      'VITE_VIEW',
      ...SERVER_SECRET_VARS,
    ]) {
      expect(example).toContain(name);
    }
    expect(example).toContain('npm run validate:env');
    expect(example).toContain('/admin');
    expect(example).not.toContain('/deck/admin` uses');
  });

  it('links the setup guide from README and project notes', () => {
    const readme = read('README.md');
    expect(readme).toContain('docs/admin-setup-and-secrets.md');
    expect(readme).toContain('npm run validate:env');
    expect(read('.env.example')).toContain('docs/admin-setup-and-secrets.md');

    const project = read('project.md');
    expect(project).toContain('docs/admin-setup-and-secrets.md');
    expect(project).toContain('issues/374');
  });

  it('covers setup, deployment, secrets and troubleshooting in the guide', () => {
    const guide = read('docs/admin-setup-and-secrets.md');
    for (const heading of [
      'Client variables',
      'Server secrets',
      'Deploy Edge Functions',
      'Google Drive setup',
      'Owner admin access',
      'Read-only mode',
      'Troubleshooting',
      'Secret-handling rules',
    ]) {
      expect(guide).toContain(heading);
    }
    expect(guide).toContain('supabase secrets set');
    expect(guide).toContain('ALLOWED_ORIGIN=http://localhost:5173');
    expect(guide).toContain('app_admins');
    expect(guide).toContain('TOTP');
  });

  it('wires the validate:env npm script', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts['validate:env']).toBe('node scripts/validate-env.mjs');
  });
});
