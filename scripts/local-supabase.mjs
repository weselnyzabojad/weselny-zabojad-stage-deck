#!/usr/bin/env node
// Local Supabase workflow for issues #904/#917. Everything runs on the host:
// Docker provides Supabase, Vite/Vitest stay outside.

import { spawnSync } from 'node:child_process';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { assertLocalSupabaseUrl } from './lib/local-guard.mjs';

const ROOT = process.cwd();
const BASELINE = path.join(ROOT, 'supabase', 'migrations', '00000000000000_base_schema.sql');
const ENV_FILE = path.join(ROOT, '.env.local');
const SERVER_ENV_FILE = path.join(ROOT, 'supabase', '.env.local');
// `supabase start` loads `supabase/functions/.env` into the Edge runtime, so
// the same local secrets are written there too and functions work without a
// separate `functions serve` process.
const FUNCTIONS_ENV_FILE = path.join(ROOT, 'supabase', 'functions', '.env');
const EXCLUDED_SERVICES = 'studio,imgproxy,storage-api,logflare,vector,supavisor';
const DEFAULT_API_URL = 'http://127.0.0.1:54321';
const LOCAL_ORIGIN = 'http://localhost:5173';
const COMPOSE_FILE = path.join(ROOT, 'docker-compose.local.yml');
const MOCK_DRIVE_API_BASE = 'http://google-drive-mock:8080';
const MOCK_DRIVE_CONTAINER = 'stage-deck-google-drive-mock';
const MOCK_SERVICE_CONTAINER = 'stage-deck-service-mock';
const MOCK_DRIVE_EMAIL = 'drive-mock@stage-deck.local';

function run(command, args, { capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = capture ? `${result.stdout ?? ''}${result.stderr ?? ''}`.trim() : '';
    throw new Error(`${command} ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`);
  }
  return result.stdout ?? '';
}

function has(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  return !result.error && result.status === 0;
}

function ensureDocker() {
  if (!has('docker', ['info'])) {
    console.error(
      'Docker is unavailable. Start Docker Desktop (or another engine) and retry `npm run local:start`.',
    );
    process.exit(1);
  }
}

function parseStatus(output) {
  const values = {};
  for (const line of output.split(/\r?\n/)) {
    const env = /^([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/.exec(line.trim());
    if (env) values[env[1]] = env[2];
  }
  const table = (label) => {
    const match = new RegExp(`${label}[^\\n]*?[:|]\\s*(\\S+)`, 'i').exec(output);
    return match?.[1] ?? null;
  };
  return {
    apiUrl: values.API_URL ?? values.SUPABASE_URL ?? table('API URL') ?? DEFAULT_API_URL,
    anonKey: values.ANON_KEY ?? values.ANON_KEY_ID ?? table('anon key') ?? '',
    serviceKey:
      values.SERVICE_ROLE_KEY ?? values.SERVICE_ROLE_KEY_ID ?? table('service_role key') ?? '',
  };
}

function readExistingServerEnv() {
  if (!existsSync(SERVER_ENV_FILE)) return {};
  const values = {};
  for (const line of readFileSync(SERVER_ENV_FILE, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function localJwtKey(existing) {
  if (existing.DECK_SUPABASE_JWT_PRIVATE_KEY) {
    return {
      privateKey: unquote(existing.DECK_SUPABASE_JWT_PRIVATE_KEY),
      keyId: unquote(existing.DECK_SUPABASE_JWT_KEY_ID) || 'local-key',
    };
  }
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return {
    privateKey: JSON.stringify(privateKey.export({ format: 'jwk' })),
    keyId: `local-${randomBytes(4).toString('hex')}`,
  };
}

function unquote(value) {
  return String(value ?? '')
    .replace(/^["']+|["']+$/g, '')
    .trim();
}

// Local Google Drive setup. Existing values win, so a configured service
// account (or a tweaked API base) survives `local:start`/`local:reset`. With no
// values, generate a disposable RSA key and point the Edge Functions at the
// dockerized Drive mock.
function localGoogleConfig(existing) {
  const email = unquote(existing.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  const privateKey = unquote(existing.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
  const apiBase = unquote(existing.GOOGLE_DRIVE_API_BASE);
  const testFileId = unquote(existing.GOOGLE_DRIVE_TEST_FILE_ID);
  if (email && privateKey) return { email, privateKey, apiBase, testFileId };

  const { privateKey: generated } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = generated.export({ type: 'pkcs8', format: 'pem' });
  return {
    email: MOCK_DRIVE_EMAIL,
    privateKey: pem.replace(/\r?\n/g, '\\n'),
    apiBase: MOCK_DRIVE_API_BASE,
    testFileId: '',
  };
}

function writeEnvFile(file, lines) {
  writeFileSync(file, `${lines.join('\n')}\n`);
}

function writeEnv(apiUrl, anonKey, serviceKey) {
  const existing = readExistingServerEnv();
  const jwt = localJwtKey(existing);
  const speechKey = unquote(existing.SPEECH_SECRET_MASTER_KEY) || randomBytes(32).toString('base64');
  const google = localGoogleConfig(existing);

  writeEnvFile(ENV_FILE, [
    '# Generated by `npm run local:start`; gitignored.',
    `VITE_SUPABASE_URL=${apiUrl}`,
    `VITE_SUPABASE_ANON_KEY=${anonKey}`,
    'VITE_DECK_MODE=local',
  ]);

  const serverLines = [
    '# Generated by `npm run local:start`; gitignored. Local-only secrets.',
    `ALLOWED_ORIGIN=${LOCAL_ORIGIN}`,
    `PUBLIC_DECK_URL=${LOCAL_ORIGIN}`,
    `SUPABASE_URL=${apiUrl}`,
    `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`,
    `DECK_SUPABASE_JWT_KEY_ID=${jwt.keyId}`,
    `DECK_SUPABASE_JWT_PRIVATE_KEY='${jwt.privateKey}'`,
    `SPEECH_SECRET_MASTER_KEY=${speechKey}`,
    `GOOGLE_SERVICE_ACCOUNT_EMAIL=${google.email}`,
    `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY='${google.privateKey}'`,
    `GOOGLE_DRIVE_API_BASE=${google.apiBase}`,
    `GOOGLE_DRIVE_TEST_FILE_ID=${google.testFileId}`,
    'SENTRY_API_BASE=http://service-mock:8080/sentry/api/0',
    'SENTRY_ORG_SLUG=local',
    'SENTRY_PROJECT_SLUG=stage-deck',
    'SENTRY_API_TOKEN=local-service-mock-token',
    'SUNSET_HEALTH_URL=http://service-mock:8080/sunset',
  ];
  writeEnvFile(SERVER_ENV_FILE, serverLines);
  // The local Edge runtime container loads `supabase/.env` at start; keep it in
  // sync so `local:reset`/`local:start` and `functions serve` see the same values.
  writeEnvFile(path.join(ROOT, 'supabase', '.env'), serverLines);
  // `supabase start` only reads this path; `functions serve --env-file` still
  // works, but the default start now serves functions with the local secrets.
  writeEnvFile(FUNCTIONS_ENV_FILE, serverLines);
  return google;
}

function startLocalMocks() {
  if (!has('docker', ['compose', 'version'])) {
    console.error(
      'Docker Compose is required for the local service mocks. Install it or configure real provider values in supabase/.env.local.',
    );
    process.exit(1);
  }
  run('docker', ['compose', '-f', COMPOSE_FILE, 'up', '-d', '--wait']);
}

function stopLocalMocks() {
  try {
    run('docker', ['compose', '-f', COMPOSE_FILE, 'down', '--remove-orphans']);
  } catch {
    // The mocks were never started; `local:stop` still stops Supabase.
  }
}

function driveMockStatus() {
  const result = spawnSync(
    'docker',
    ['inspect', '--format', '{{.State.Status}}', MOCK_DRIVE_CONTAINER],
    { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' },
  );
  return result.status === 0 ? result.stdout.trim() : 'not running';
}

function serviceMockStatus() {
  const result = spawnSync(
    'docker',
    ['inspect', '--format', '{{.State.Status}}', MOCK_SERVICE_CONTAINER],
    { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' },
  );
  return result.status === 0 ? result.stdout.trim() : 'not running';
}

function createBaseline() {
  writeFileSync(BASELINE, readFileSync(path.join(ROOT, 'supabase', 'schema.sql')));
}

function removeBaseline() {
  if (existsSync(BASELINE)) unlinkSync(BASELINE);
}

function stackStatus() {
  try {
    return parseStatus(run('npx', ['supabase', 'status', '-o', 'env'], { capture: true }));
  } catch {
    return null;
  }
}

function printSummary(status) {
  console.log('\nLocal Supabase is ready.');
  console.log(`  API:      ${status.apiUrl}`);
  console.log(`  Studio:   http://127.0.0.1:54323 (when not excluded)`);
  console.log(`  Anon key: ${status.anonKey ? '(written to .env.local)' : '(run supabase status)'}`);
  console.log('Next:');
  console.log('  npm run local:serve');
  console.log('  npm run dev');
}

function start({ reset = false, seed = false } = {}) {
  ensureDocker();
  let didReset = false;
  const current = stackStatus();
  if (!current?.apiUrl) {
    createBaseline();
    try {
      run('npx', ['supabase', 'start', '-x', EXCLUDED_SERVICES]);
    } finally {
      removeBaseline();
    }
  }

  if (reset || !current?.apiUrl) {
    createBaseline();
    try {
      run('npx', ['supabase', 'db', 'reset']);
      didReset = true;
    } finally {
      removeBaseline();
    }
  }

  const status = stackStatus();
  if (!status?.anonKey || !status?.serviceKey) {
    console.error('Supabase is running but its local keys could not be read. Run `npx supabase status`.');
    process.exit(1);
  }
  try {
    assertLocalSupabaseUrl(status.apiUrl, 'Local Supabase API URL');
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  writeEnv(status.apiUrl, status.anonKey, status.serviceKey);
  startLocalMocks();
  if (didReset || seed) run('npm', ['run', 'local:seed']);
  printSummary(status);
}

function stop() {
  stopLocalMocks();
  run('npx', ['supabase', 'stop']);
}

function status() {
  const current = stackStatus();
  if (!current) {
    console.error('The local Supabase stack is not running. Start it with `npm run local:start`.');
    process.exit(1);
  }
  run('npx', ['supabase', 'status']);
  console.log(`Google Drive mock: ${driveMockStatus()}`);
  console.log(`Service health mock: ${serviceMockStatus()}`);
}

const command = process.argv[2] ?? 'start';
try {
  if (command === 'start') start();
  else if (command === 'reset') start({ reset: true });
  else if (command === 'stop') stop();
  else if (command === 'status') status();
  else {
    console.error('Usage: node scripts/local-supabase.mjs <start|stop|status|reset>');
    process.exit(1);
  }
} catch (error) {
  removeBaseline();
  console.error(error.message);
  process.exit(1);
}

