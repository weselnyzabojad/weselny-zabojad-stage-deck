// Environment/configuration gate for issue #374.
//
// Validates the browser-safe client configuration without ever printing a
// secret value. Server-side secrets belong in Supabase Edge Function secrets
// and are deliberately *not* read or required by this script.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const REQUIRED_CLIENT_VARS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

export const OPTIONAL_CLIENT_VARS = {
  VITE_DECK_MODE: 'local (default) or production',
  VITE_SUPABASE_SYNC_TABLE: 'defaults to live_sync_state',
  VITE_SUPABASE_ROOM_PREFIX: 'defaults to wzsd',
  VITE_ADMIN_DEMO: 'dev-only read-only admin preview when set to 1',
  VITE_VIEW: 'dev-only role/view override',
  VITE_SENTRY_DSN: 'public Sentry DSN; overrides the built-in production DSN (empty disables)',
  VITE_SENTRY_ENVIRONMENT: 'Sentry environment label, defaults to production',
};

export const SERVER_SECRET_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PUBLIC_DECK_URL',
  'ALLOWED_ORIGIN',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
  'GOOGLE_DRIVE_TEST_FILE_ID',
];

const DANGEROUS_NAME_PATTERN =
  /(SERVICE_ROLE|JWT_SECRET|PRIVATE_KEY|CLIENT_SECRET|SECRET_KEY|PASSWORD|ACCESS_TOKEN|REFRESH_TOKEN)/i;

const PLACEHOLDER_PATTERN = /^(your[-_]|example|changeme|replace[-_]?me|\.{3}|<.+>)/i;

const DECK_MODES = new Set(['local', 'production']);

/** Parse dotenv-style text into a plain object. Values are never logged. */
export function parseEnv(text) {
  const env = {};
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rest] = match;
    let value = rest;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[key] = value;
  }
  return env;
}

/**
 * Load the same client env files Vite reads, in increasing priority order.
 * Explicit `files` replaces the default list (used by tests and CI).
 */
export function loadEnvFiles({ root = ROOT, mode = '', files = null } = {}) {
  const candidates = files ?? [
    '.env',
    '.env.local',
    mode ? `.env.${mode}` : null,
    mode ? `.env.${mode}.local` : null,
  ].filter(Boolean);

  const env = {};
  const loaded = [];
  for (const file of candidates) {
    const path = isAbsolute(file) ? file : join(root, file);
    if (!existsSync(path)) continue;
    Object.assign(env, parseEnv(readFileSync(path, 'utf8')));
    loaded.push(path);
  }
  return { env, loaded };
}

function jwtRole(value) {
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    );
    return typeof payload?.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

/** Return dangerous client-exposed variables without exposing their values. */
export function findDangerousClientVars(env) {
  const findings = [];
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('VITE_')) continue;
    if (DANGEROUS_NAME_PATTERN.test(name)) {
      findings.push({
        name,
        reason: 'the variable name looks like a server-only secret',
      });
      continue;
    }
    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)) {
      findings.push({ name, reason: 'the value contains a private key' });
    } else if (value.startsWith('sb_secret_')) {
      findings.push({ name, reason: 'the value is a Supabase secret key' });
    } else if (jwtRole(value) === 'service_role') {
      findings.push({ name, reason: 'the value is a service-role JWT' });
    }
  }
  return findings;
}

/** Validate a parsed client env object. Returns messages that contain names only. */
export function validateEnv(env, { allowMissing = false, requireProduction = false } = {}) {
  const errors = [];
  const warnings = [];
  const notes = [];

  if (requireProduction && env.VITE_DECK_MODE !== 'production') {
    errors.push(
      'Production deployments require VITE_DECK_MODE=production. ' +
        'Set it in the Netlify build environment; only explicit local/demo builds may omit it.',
    );
  }

  for (const finding of findDangerousClientVars(env)) {
    errors.push(
      `${finding.name} must not be exposed to the browser (${finding.reason}). ` +
        'Remove it from .env.local and set it with `supabase secrets set` instead.',
    );
  }

  for (const name of REQUIRED_CLIENT_VARS) {
    const value = env[name];
    if (!value) {
      const message = `Missing required client variable ${name}. Copy .env.example to .env.local and fill it in.`;
      (allowMissing ? warnings : errors).push(message);
      continue;
    }
    if (PLACEHOLDER_PATTERN.test(value)) {
      errors.push(`${name} still contains a placeholder value. Replace it with the real project value.`);
    }
  }

  const url = env.VITE_SUPABASE_URL;
  if (url && !PLACEHOLDER_PATTERN.test(url)) {
    try {
      const parsed = new URL(url);
      const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
      if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && localHost)) {
        errors.push('VITE_SUPABASE_URL must use https:// (http:// is only accepted for localhost).');
      }
      if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
        errors.push('VITE_SUPABASE_URL must be the project base URL without a path, query or hash.');
      }
    } catch {
      errors.push('VITE_SUPABASE_URL is not a valid URL.');
    }
  }

  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  if (anonKey && !PLACEHOLDER_PATTERN.test(anonKey)) {
    if (jwtRole(anonKey) === 'service_role') {
      errors.push('VITE_SUPABASE_ANON_KEY is a service-role key. Use the public anon/publishable key only.');
    }
    if (anonKey.length < 20) {
      warnings.push('VITE_SUPABASE_ANON_KEY looks unusually short. Check the Supabase project API settings.');
    }
  }

  const mode = env.VITE_DECK_MODE;
  if (mode && !DECK_MODES.has(mode)) {
    errors.push(`VITE_DECK_MODE must be "local" or "production" (received an unsupported value).`);
  }

  for (const name of Object.keys(OPTIONAL_CLIENT_VARS)) {
    if (!(name in env)) continue;
    if (name.startsWith('VITE_SUPABASE_') && !env[name]) {
      warnings.push(`${name} is set but empty; the app will use its default.`);
    }
  }

  for (const name of SERVER_SECRET_VARS) {
    if (name in env && !name.startsWith('VITE_')) {
      notes.push(
        `${name} is a server-side secret name found in a client env file. ` +
          'Keep server values in `supabase secrets set`; Vite will not bundle it.',
      );
    }
  }

  return { errors, warnings, notes };
}

export function formatReport({ errors, warnings, notes }, { files = [] } = {}) {
  const lines = [];
  if (files.length) {
    lines.push(`Env files loaded: ${files.map((file) => file.split(/[\\/]/).pop()).join(', ')}`);
  } else {
    lines.push('Env files loaded: none (checked process environment only).');
  }

  for (const note of notes) lines.push(`  note: ${note}`);

  if (errors.length === 0) {
    lines.push('✓ Client configuration is valid.');
    if (warnings.length === 0) {
      lines.push('✓ No server secrets are exposed through VITE_* variables.');
    }
  }

  for (const warning of warnings) lines.push(`  warning: ${warning}`);
  for (const error of errors) lines.push(`  error: ${error}`);

  if (errors.length > 0) {
    lines.push('');
    lines.push('Setup guide: docs/admin-setup-and-secrets.md');
    lines.push('Server secrets are set with: supabase secrets set NAME=value');
  }
  return lines.join('\n');
}

function parseArgs(argv) {
  const options = { allowMissing: false, requireProduction: false, mode: '', envFile: '', help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--allow-missing') options.allowMissing = true;
    else if (arg === '--require-production') options.requireProduction = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--mode') options.mode = argv[++index] ?? '';
    else if (arg.startsWith('--mode=')) options.mode = arg.slice('--mode='.length);
    else if (arg === '--env-file') options.envFile = argv[++index] ?? '';
    else if (arg.startsWith('--env-file=')) options.envFile = arg.slice('--env-file='.length);
    else {
      options.unknown = arg;
    }
  }
  return options;
}

/** Load dotenv files plus the allowed public variables from process.env. */
export function collectClientEnv({ mode = '', envFile = '', processEnv = process.env } = {}) {
  const loaded = loadEnvFiles({
    mode,
    files: envFile ? [envFile] : null,
  });
  const env = { ...loaded.env };
  for (const [name, value] of Object.entries(processEnv)) {
    if (name.startsWith('VITE_') || SERVER_SECRET_VARS.includes(name)) env[name] = value;
  }
  return { env, loaded };
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(
      [
        'Usage: npm run validate:env [-- --env-file PATH] [--mode development|production] [--allow-missing] [--require-production]',
        '',
        'Validates browser-safe VITE_* configuration. Never prints secret values.',
        'Missing required values are errors unless --allow-missing is used.',
        '--require-production additionally fails unless VITE_DECK_MODE=production.',
        'Server-only secrets are configured with `supabase secrets set`.',
      ].join('\n'),
    );
    return 0;
  }
  if (options.unknown) {
    console.error(`Unknown argument: ${options.unknown}`);
    return 2;
  }

  const { env, loaded } = collectClientEnv({
    mode: options.mode,
    envFile: options.envFile,
  });
  const result = validateEnv(env, {
    allowMissing: options.allowMissing,
    requireProduction: options.requireProduction,
  });
  console.log(formatReport(result, { files: loaded.loaded }));
  return result.errors.length > 0 ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
